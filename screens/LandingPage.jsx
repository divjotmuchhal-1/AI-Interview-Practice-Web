'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { FREE_SESSION_LIMIT, PACK_SESSIONS, PACK_VALID_DAYS, PACK_PRICE_USD } from '@/lib/sessionLimits';

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function IconCode() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5.5 5L1.5 9l4 4M12.5 5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBot() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="14" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7" cy="10.5" r="1.2" fill="currentColor"/>
      <circle cx="11" cy="10.5" r="1.2" fill="currentColor"/>
      <path d="M9 6V3.5M7.5 3.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconRadar() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 1.5L16.5 6v6L9 16.5 1.5 12V6L9 1.5Z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9 5.5L13 8v4l-4 2.5-4-2.5V8l4-2.5Z" stroke="currentColor" strokeWidth="1" opacity="0.45"/>
      <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="14" height="12.5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 8h14" stroke="currentColor" strokeWidth="1.1"/>
      <rect x="6.5" y="11" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="5.5" y="5" width="2" height="1.8" rx="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="10.5" y="5" width="2" height="1.8" rx="0.4" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
}
function IconFlame() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2c0 0 4.5 4 4.5 8a4.5 4.5 0 01-9 0C4.5 6.5 7 5 7 5c0 0-.8 2.8 1.5 4C8.5 7 9 2 9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTest() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Syntax colour helpers ─────────────────────────────────────────────────────
const Kw = ({ children }) => <span className="lp-kw">{children}</span>;
const Fn = ({ children }) => <span className="lp-fn">{children}</span>;
const Cm = ({ children }) => <span className="lp-cm">{children}</span>;
const Nm = ({ children }) => <span className="lp-nm">{children}</span>;
const Pu = ({ children }) => <span className="lp-pu">{children}</span>;

function Line({ n, children, bug = false }) {
  return (
    <div className={`lp-line${bug ? ' lp-line--bug' : ''}`}>
      <span className="lp-ln">{n}</span>
      <span className="lp-lc">{children}</span>
    </div>
  );
}

// ── Code editor mockup ────────────────────────────────────────────────────────
function CodeMockup() {
  return (
    <div className="lp-editor" role="img" aria-label="Broken LRU Cache code with a failing test, the kind of scenario you practice here">
      <div className="lp-editor-bar">
        <span className="lp-dot lp-dot--r" />
        <span className="lp-dot lp-dot--y" />
        <span className="lp-dot lp-dot--g" />
        <span className="lp-editor-file">lru_cache.py</span>
        <span className="lp-editor-badge">3 bugs</span>
      </div>
      <div className="lp-editor-body">
        <div className="lp-editor-lines">
          <Line n={1}><Kw>class </Kw><Fn>LRUCache</Fn><Pu>:</Pu></Line>
          <Line n={2}><Pu>    </Pu><Kw>def </Kw><Fn>__init__</Fn><Pu>(</Pu><Kw>self</Kw><Pu>, </Pu>capacity<Pu>):</Pu></Line>
          <Line n={3}><Pu>        </Pu><Kw>self</Kw><Pu>.</Pu>cap   <Pu>= </Pu>capacity</Line>
          <Line n={4}><Pu>        </Pu><Kw>self</Kw><Pu>.</Pu>cache <Pu>= </Pu><Pu>{'{}'}</Pu></Line>
          <Line n={5}><Pu>        </Pu><Kw>self</Kw><Pu>.</Pu>head  <Pu>= </Pu><Fn>Node</Fn><Pu>(</Pu><Nm>0</Nm><Pu>, </Pu><Nm>0</Nm><Pu>)</Pu></Line>
          <Line n={6}><Pu>        </Pu><Kw>self</Kw><Pu>.</Pu>tail  <Pu>= </Pu><Fn>Node</Fn><Pu>(</Pu><Nm>0</Nm><Pu>, </Pu><Nm>0</Nm><Pu>)</Pu></Line>
          <Line n={7} bug><Cm>        # ← sentinel nodes never linked</Cm></Line>
          <Line n={8}>&nbsp;</Line>
          <Line n={9}><Pu>    </Pu><Kw>def </Kw><Fn>get</Fn><Pu>(</Pu><Kw>self</Kw><Pu>, </Pu>key<Pu>):</Pu></Line>
          <Line n={10}><Pu>        </Pu><Kw>if </Kw>key <Kw>not in </Kw><Kw>self</Kw><Pu>.</Pu>cache<Pu>:</Pu></Line>
          <Line n={11}><Pu>            </Pu><Kw>return </Kw><Nm>-1</Nm></Line>
          <Line n={12} bug><Cm>        # ← missing MRU promotion</Cm></Line>
          <Line n={13}><Pu>        </Pu><Kw>return </Kw><Kw>self</Kw><Pu>.</Pu>cache<Pu>[</Pu>key<Pu>].</Pu>val</Line>
        </div>
        <div className="lp-editor-fail">
          <div className="lp-fail-header">
            <span className="lp-fail-dot" />
            <span className="lp-fail-name">test_eviction_order</span>
            <span className="lp-fail-label">FAIL</span>
          </div>
          <div className="lp-fail-row">
            <span className="lp-fail-key">expected</span>
            <span className="lp-fail-pass">3</span>
          </div>
          <div className="lp-fail-row">
            <span className="lp-fail-key">received</span>
            <span className="lp-fail-fail">-1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: IconCode,     title: 'Debug real broken code',         desc: 'Pre-broken implementations from actual interview patterns. Find and fix the bugs, no blank-slate busywork.' },
  { Icon: IconBot,      title: 'AI coach, not answer machine',   desc: 'Hints redirect your thinking toward the bug. The coach refuses to write the fix and notices when you rubber-stamp its suggestions.' },
  { Icon: IconRadar,    title: '6-axis performance review',      desc: 'Scored on Diagnosis, Independence, Precision, Verification, Recovery, and Test Ownership. Not just pass/fail.' },
  { Icon: IconBuilding, title: 'Real company scenario formats',  desc: 'EventEmitter (Meta), LRU Cache (Amazon), Prefix Trie (Google), Rate Limiter, Transaction Engine, and 6 more.' },
  { Icon: IconFlame,    title: 'Hard mode',                      desc: 'Adds realistic interviewer pressure: scope creep, over-engineering bait, correctness doubts. Practice staying focused.' },
  { Icon: IconTest,     title: 'Live in-browser test runner',    desc: 'Instant feedback on every edit. Hidden tests reveal edge cases once you complete each part.' },
];

const SCENARIOS = [
  {
    company: 'META',   difficulty: 'Medium', diffColor: '#ff9800',
    title: 'EventEmitter',
    desc: 'Three bugs: listeners fire in reverse order, off() wipes the whole event, once() never removes itself.',
    tags: ['pub-sub', 'closures'], parts: 3, min: 30,
  },
  {
    company: 'AMAZON', difficulty: 'Hard',   diffColor: '#f44336',
    title: 'LRU Cache',
    desc: 'Sentinel nodes never linked, eviction hits the wrong end, and get/put skip MRU promotion entirely.',
    tags: ['data-structures', 'linked list'], parts: 3, min: 35,
  },
  {
    company: 'GOOGLE', difficulty: 'Easy',   diffColor: '#4caf50',
    title: 'CSV Parser',
    desc: 'Drops the last field on every row, strips leading whitespace, and enters quote mode at the wrong character.',
    tags: ['parsing', 'strings'], parts: 3, min: 25,
  },
  {
    company: 'GOOGLE', difficulty: 'Medium', diffColor: '#ff9800',
    title: 'Prefix Tree (Trie)',
    desc: 'search() returns True for prefixes, get_words_with_prefix() builds results in reverse, case handling is inconsistent.',
    tags: ['data-structures', 'recursion'], parts: 3, min: 30,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay ?? '0';
            entry.target.style.transitionDelay = `${delay}ms`;
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp-root">

      {/* Nav */}
      <nav className="lp-nav" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <span className="lp-brand-mark" aria-hidden="true">{'</>'}</span>
            <span className="lp-brand-name">AI Interview Practice</span>
          </div>
          <div className="lp-nav-actions">
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <Link href="/login" className="lp-nav-link">Sign in</Link>
            <Link href="/login" className="lp-nav-cta">Get started →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-orb lp-hero-orb--1" aria-hidden="true" />
        <div className="lp-hero-orb lp-hero-orb--2" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-hero-eyebrow">Free to start · No card</span>
            <h1 className="lp-hero-h1">
              Debug your way<br />
              <span className="lp-hero-gradient">to the offer.</span>
            </h1>
            <p className="lp-hero-sub">
              Real broken code. Real interview pressure. An AI coach that refuses
              to just hand you the answer. Practice the part of interviews that
              actually tests your thinking.
            </p>
            <div className="lp-hero-btns">
              <Link href="/login" className="lp-btn-primary">Start practicing free →</Link>
              <a href="#how" className="lp-btn-ghost">How it works ↓</a>
            </div>
            <p className="lp-mobile-note">
              💻 The practice workspace is built for desktop. Create your account now and
              practice from your computer.
            </p>
          </div>
          <div className="lp-hero-visual" aria-hidden="true">
            <CodeMockup />
          </div>
        </div>
      </section>

      {/* Companies strip */}
      <div className="lp-companies">
        <div className="lp-companies-inner" data-reveal>
          <span className="lp-companies-label">Scenarios styled after interviews at</span>
          <div className="lp-companies-marks">
            {[
              { name: 'Meta',    color: '#5b9bf0' },
              { name: 'Amazon',  color: '#f2a13c' },
              { name: 'Google',  color: '#8ab4f8' },
              { name: 'Stripe',  color: '#8d87ff' },
              { name: 'Shopify', color: '#9fc45e' },
            ].map(({ name, color }) => (
              <span key={name} className="lp-company-mark" style={{ '--brand': color }}>{name}</span>
            ))}
          </div>
          <span className="lp-companies-disclaimer">Not affiliated with or endorsed by these companies</span>
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="lp-section">
        <div className="lp-section-inner">
          <h2 className="lp-section-h2" data-reveal>How a session works</h2>
          <p className="lp-section-sub" data-reveal data-delay="80">Three stages. No hand-holding between them.</p>
          <div className="lp-steps" data-reveal data-delay="160">
            <div className="lp-step">
              <span className="lp-step-label">Pick</span>
              <h3 className="lp-step-title">Choose a scenario</h3>
              <p className="lp-step-desc">
                Select from multiple real interview formats across Easy, Medium, and Hard.
                Each is a broken implementation waiting to be fixed.
              </p>
            </div>
            <div className="lp-step-sep" aria-hidden="true">→</div>
            <div className="lp-step">
              <span className="lp-step-label">Debug</span>
              <h3 className="lp-step-title">Find and fix the bugs</h3>
              <p className="lp-step-desc">
                A live test runner shows what&apos;s failing. An AI coach in the sidebar
                answers questions but won&apos;t write the fix for you.
              </p>
            </div>
            <div className="lp-step-sep" aria-hidden="true">→</div>
            <div className="lp-step">
              <span className="lp-step-label">Review</span>
              <h3 className="lp-step-title">Get scored on how you think</h3>
              <p className="lp-step-desc">
                Six behavioral axes, an AI-generated headline about your session,
                and a full timeline of every decision you made.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-section lp-section--raised">
        <div className="lp-section-inner">
          <h2 className="lp-section-h2" data-reveal>What makes it different</h2>
          <p className="lp-section-sub" data-reveal data-delay="80">Not LeetCode. Not flashcards. Actual interview simulation.</p>
          <div className="lp-features">
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <div key={title} className="lp-feature-card" data-reveal data-delay={`${(i % 3) * 90}`}>
                <div className="lp-feature-icon"><Icon /></div>
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenario preview */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <h2 className="lp-section-h2" data-reveal>Real problems. 3 difficulty levels.</h2>
          <p className="lp-section-sub" data-reveal data-delay="80">Each one is a real broken implementation. A sample:</p>
          <div className="lp-preview-grid">
            {SCENARIOS.map((s, i) => (
              <div key={s.title} className="lp-preview-card" data-reveal data-delay={`${(i % 2) * 90}`}>
                <div className="lp-preview-header">
                  <div className="lp-preview-meta">
                    <span className="lp-preview-company">{s.company}</span>
                    <span className="lp-preview-diff" style={{ color: s.diffColor }}>
                      ● {s.difficulty}
                    </span>
                  </div>
                  <span className="lp-preview-info">{s.parts} parts · {s.min} min</span>
                </div>
                <h3 className="lp-preview-title">{s.title}</h3>
                <p className="lp-preview-desc">{s.desc}</p>
                <div className="lp-preview-tags">
                  {s.tags.map((t) => <span key={t} className="lp-preview-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
          <p className="lp-preview-more" data-reveal>
            + 7 more: Rate Limiter, Feature Flags, Log Query Filter, Dependency Resolver, Merge Intervals, and others.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lp-section lp-section--raised">
        <div className="lp-section-inner">
          <h2 className="lp-section-h2" data-reveal>Simple pricing</h2>
          <p className="lp-section-sub" data-reveal data-delay="80">
            Practice unlimited scenarios for free. Pay only for AI coaching.
          </p>

          <div className="lp-pricing-grid">
            <div className="lp-price-card" data-reveal>
              <div className="lp-price-name">Free</div>
              <div className="lp-price-amount">$0<span className="lp-price-period">/month</span></div>
              <p className="lp-price-note">No credit card required</p>
              <ul className="lp-price-list">
                <li>{FREE_SESSION_LIMIT} AI-coached sessions per month, plus a free first session</li>
                <li>Unlimited practice sessions without AI</li>
                <li>3 practice tracks</li>
                <li>Full editor, tests, and answer keys</li>
              </ul>
              <Link href="/login" className="lp-price-btn">Start free</Link>
            </div>

            <div className="lp-price-card lp-price-card--pro" data-reveal data-delay="90">
              <div className="lp-price-badge">Most popular</div>
              <div className="lp-price-name">Session Pack</div>
              <div className="lp-price-amount">${PACK_PRICE_USD}<span className="lp-price-period">one time</span></div>
              <p className="lp-price-note">Not a subscription</p>
              <ul className="lp-price-list">
                <li>{PACK_SESSIONS} AI-coached sessions, valid {PACK_VALID_DAYS} days</li>
                <li>All 7 tracks, 36 scenarios</li>
                <li>AI performance grading on every session</li>
                <li>Full session history and progress tracking</li>
              </ul>
              <Link href="/login" className="lp-price-btn lp-price-btn--pro">Get {PACK_SESSIONS} sessions →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-glow" aria-hidden="true" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-h2" data-reveal>Ready to debug your way to the offer?</h2>
          <p className="lp-cta-sub" data-reveal data-delay="80">Free account. No credit card. First session in under a minute.</p>
          <Link href="/login" className="lp-btn-primary lp-btn-primary--lg" data-reveal data-delay="160">Create free account →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand-block">
              <div className="lp-footer-brand">
                <span className="lp-brand-mark" aria-hidden="true">{'</>'}</span>
                <span className="lp-footer-brand-name">AI Interview Practice</span>
              </div>
              <p className="lp-footer-tagline">AI-coached practice for your next coding interview.</p>
            </div>
            <div className="lp-footer-links">
              <a href="#how" className="lp-footer-link">How it works</a>
              <a href="#pricing" className="lp-footer-link">Pricing</a>
              <Link href="/login" className="lp-footer-link">Sign in</Link>
              <Link href="/login" className="lp-footer-link lp-footer-link--cta">Create free account →</Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">© 2026 AI Interview Practice</span>
            <div className="lp-footer-legal">
              <Link href="/terms" className="lp-footer-link">Terms</Link>
              <Link href="/privacy" className="lp-footer-link">Privacy</Link>
              <Link href="/accessibility" className="lp-footer-link">Accessibility</Link>
              <span className="lp-footer-note">Not affiliated with the companies referenced in scenarios</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
