import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · AI Interview Practice',
  description: 'Terms of Service, session packs, billing, and refund policy for AI Interview Practice.',
};

export default function TermsPage() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link href="/" className="legal-back">← AI Interview Practice</Link>
      </header>

      <main className="legal-body">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: July 2026</p>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of AI Interview Practice
          (the &quot;Service&quot;), a web application for practicing coding-interview scenarios
          with AI-assisted coaching and feedback. By creating an account or using the
          Service, you agree to these Terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          The Service provides practice coding scenarios, an in-browser code editor and
          test runner, AI-powered coaching, and AI-generated performance feedback. The
          Service is a practice and learning tool. It does not guarantee interview
          performance, job offers, or any other outcome.
        </p>
        <p>
          Scenarios are inspired by publicly known interview formats. AI Interview
          Practice is not affiliated with, sponsored by, or endorsed by Meta, Amazon,
          Google, Stripe, Shopify, or any other company referenced in scenario content.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You need an account to use the Service. You are responsible for the accuracy of
          the information you provide, for keeping your credentials secure, and for all
          activity under your account. You must be at least 13 years old to use the
          Service. We may suspend or terminate accounts that violate these Terms.
        </p>

        <h2>3. Plans, Billing, and Session Packs</h2>
        <p>
          The Service offers a Free plan with monthly usage limits and a paid Session
          Pack. A Session Pack is a <strong>one-time purchase, not a subscription</strong>.
          There is nothing to cancel and nothing renews. Payment is taken once through our
          payment processor, Stripe.
        </p>
        <p>
          Each pack grants a fixed number of AI-coached sessions and an associated
          allowance of AI coaching interactions, both valid for the period stated at
          checkout. Unused sessions and interactions expire at the end of that period and
          do not carry over. Buying another pack adds to your balance and extends the
          expiry. Your free monthly allowance is spent before purchased sessions, so a
          pack lasts as long as possible.
        </p>
        <p>
          Free-plan monthly limits reset each calendar month and unused free sessions do
          not roll over. Prices and pack contents may change; changes apply to future
          purchases only and never to a pack you have already bought.
        </p>

        <h2>4. Refunds</h2>
        <p>
          Session Packs are digital goods delivered immediately, and payments are final
          and non-refundable except as set out below. The Free plan, including a free
          first session, exists so you can fully evaluate the Service before paying.
        </p>
        <p>
          By purchasing, you expressly request immediate delivery and consent to the
          Service being available to you at once, and acknowledge that, where permitted by
          law, this waives any statutory withdrawal or cooling-off right for the portion
          of the pack you have used. Nothing in this section limits non-waivable statutory
          rights in your jurisdiction.
        </p>
        <p>
          We will refund a pack in full if you have not started a session against it, if
          you were charged in error, or if a fault or accessibility barrier on our side
          prevents you from using what you paid for. Beyond that we may issue a refund at
          our discretion. Requests:{' '}
          <a href="mailto:divjotmuchhal@gmail.com">divjotmuchhal@gmail.com</a> from the
          address on your account. A discretionary refund is not a waiver of this policy
          for any other charge.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the Service&apos;s AI endpoints for purposes other than the provided practice features, or attempt to bypass usage limits, rate limits, or plan restrictions;</li>
          <li>probe, scrape, reverse engineer, or disrupt the Service or its infrastructure;</li>
          <li>share one account across multiple people, or resell access to the Service;</li>
          <li>upload content that is unlawful or infringes the rights of others.</li>
        </ul>

        <h2>6. Your Content and Our Content</h2>
        <p>
          You retain ownership of the code and text you write in the Service. You grant
          us a limited license to store and process it in order to operate the Service,
          including sending it to our AI provider to power coaching and feedback
          (see the <Link href="/privacy">Privacy Policy</Link>).
        </p>
        <p>
          The Service&apos;s scenario content, grading rubrics, design, and software are our
          intellectual property. You may not copy, redistribute, or create derivative
          works from them outside of normal personal use of the Service.
        </p>

        <h2>7. AI-Generated Content</h2>
        <p>
          Coaching responses, hints, and performance feedback are generated by AI and
          may be inaccurate or incomplete. They are provided for practice purposes only
          and do not constitute professional or career advice.
        </p>

        <h2>8. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any
          kind, express or implied, including fitness for a particular purpose and
          non-infringement. We do not warrant that the Service will be uninterrupted,
          error-free, or that content (including scenario tests and answer keys) is free
          of defects.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, our total liability for any claim
          arising out of or relating to the Service is limited to the amount you paid us
          in the 12 months before the claim arose. We are not liable for indirect,
          incidental, special, or consequential damages, including lost opportunities or
          lost profits.
        </p>

        <h2>10. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may
          suspend or terminate your access for violation of these Terms, with refunds
          handled per Section 4 where applicable.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be
          communicated through the Service or by email, and continued use after changes
          take effect constitutes acceptance.
        </p>

        <h2>12. Contact</h2>
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:divjotmuchhal@gmail.com">divjotmuchhal@gmail.com</a>
        </p>
      </main>

      <footer className="legal-footer">
        <Link href="/terms">Terms</Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/accessibility">Accessibility</Link>
        <span aria-hidden="true">·</span>
        <Link href="/">Home</Link>
      </footer>
    </div>
  );
}
