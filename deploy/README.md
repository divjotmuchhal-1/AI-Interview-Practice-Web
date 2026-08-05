# Deploying to a Hetzner VPS

One-time setup for `aicodingprep.com`, then `deploy.sh` for every release.

On a VPS you own security and uptime: the firewall, SSH access, OS patches, and
TLS are yours to maintain. The steps below cover all of them.

**Server:** Hetzner Cloud CX22 (2 vCPU, 4 GB RAM) or larger. 4 GB matters
because `next build` is memory hungry; a 2 GB instance can fail mid-build.
Choose Ubuntu 24.04 and add your SSH public key during creation.

---

## 1. First login and a non-root user

```bash
ssh root@<server-ip>

adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copy your SSH key
```

## 2. Lock down SSH

```bash
# /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'        /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

Open a second terminal and confirm `ssh deploy@<server-ip>` works **before**
closing this one, or you can lock yourself out.

## 3. Firewall, automatic security updates, brute-force protection

```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw --force enable

apt update && apt install -y unattended-upgrades fail2ban
dpkg-reconfigure -plow unattended-upgrades   # choose Yes
systemctl enable --now fail2ban
```

Only 22, 80, and 443 are reachable. The app on port 3000 binds to loopback and
is never exposed directly.

## 4. Node.js and Caddy

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git

apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

## 5. Point DNS at the server

At your registrar, for `aicodingprep.com`:

| Type | Name | Value |
|---|---|---|
| A | `@` | `<server-ipv4>` |
| A | `www` | `<server-ipv4>` |
| AAAA | `@` | `<server-ipv6>` (optional) |

Wait until `dig +short aicodingprep.com` returns your IP. Caddy needs DNS to
resolve before it can obtain a certificate.

## 6. Clone and configure the app

```bash
su - deploy
git clone https://github.com/divjotmuchhal-1/AI-Interview-Practice-Web.git app
cd app

nano .env.production      # all 9 variables; see .env.local.example
chmod 600 .env.production # secrets readable only by deploy
```

`NEXT_PUBLIC_APP_URL=https://aicodingprep.com` (no trailing slash), and use
live-mode Stripe keys.

## 7. Install the service and proxy

```bash
exit   # back to root

cp /home/deploy/app/deploy/aicodingprep.service /etc/systemd/system/
cp /home/deploy/app/deploy/Caddyfile /etc/caddy/Caddyfile

# Let deploy restart only this service, so deploys need no full sudo.
echo 'deploy ALL=(root) NOPASSWD: /bin/systemctl restart aicodingprep, /bin/journalctl -u aicodingprep *' \
  > /etc/sudoers.d/deploy-app
chmod 440 /etc/sudoers.d/deploy-app

mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy
systemctl daemon-reload
systemctl enable aicodingprep
systemctl reload caddy
```

## 8. First deploy

```bash
su - deploy
chmod +x ~/app/deploy/deploy.sh
~/app/deploy/deploy.sh
```

Then visit `https://aicodingprep.com`. Caddy issues the TLS certificate on the
first request, which can take a few seconds.

---

## Every release after that

```bash
ssh deploy@<server-ip>
~/app/deploy/deploy.sh
```

It pulls `main`, installs, builds, restarts, and health-checks. A failed build
aborts before the restart, leaving the running site untouched.

## Operating it

```bash
sudo journalctl -u aicodingprep -f      # live app logs
sudo systemctl status aicodingprep      # is it running
sudo journalctl -u caddy -n 50          # TLS or proxy problems
free -h && df -h                        # memory and disk
```

**Backups.** Enable Hetzner's automated backups (about 20% of server cost) in
the Cloud Console. Your database lives in Supabase and is backed up separately;
the server holds only code and `.env.production`, so keep a copy of that file
somewhere safe offline.

**If the build runs out of memory** on a small instance, add swap once:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Monitoring.** Nothing tells you if the site goes down. Add a free external
check (UptimeRobot or Better Stack) against `https://aicodingprep.com` with
email alerts. On a VPS this is not optional the way it is on a managed host.

## What differs from a managed platform

- The in-memory rate limiter in `lib/rateLimit.ts` is more effective here: one
  long-lived process means counters are not reset by instance recycling. The
  durable Postgres limits still apply and are still the real ceiling.
- SSE streaming works natively; `flush_interval -1` in the Caddyfile is what
  keeps the proxy from buffering it.
- There is no autoscaling. One server handles this app comfortably at launch
  scale, but capacity is now a thing you watch rather than something automatic.
