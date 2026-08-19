import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility · AI Interview Practice',
  description:
    'Accessibility statement for AI Interview Practice: conformance status, known limitations, and how to request an accommodation.',
};

export default function AccessibilityPage() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link href="/" className="legal-back">← AI Interview Practice</Link>
      </header>

      <main className="legal-body">
        <h1>Accessibility Statement</h1>
        <p className="legal-updated">Last updated: August 2026</p>

        <p>
          AI Interview Practice is committed to making this Service usable by as many
          people as possible, including people who use assistive technology. This
          statement describes where we currently stand, what we know does not yet work
          well, and how to reach us if something blocks you.
        </p>

        <h2>1. Conformance Status</h2>
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA.
          The Service is <strong>partially conformant</strong>: parts of it meet that
          standard and parts do not. We have not completed a formal third-party audit, so
          this statement reflects our own assessment rather than a certified result. We
          would rather say that plainly than claim a level we have not verified.
        </p>

        <h2>2. What Currently Works</h2>
        <ul>
          <li>Keyboard navigation across sign-in, the scenario picker, and session setup.</li>
          <li>Visible focus states on interactive controls.</li>
          <li>Semantic headings and landmarks on marketing and legal pages.</li>
          <li>Dialogs expose their role and title to assistive technology.</li>
          <li>Motion is reduced automatically when your system requests it.</li>
          <li>Text can be resized and the layout reflows without horizontal scrolling.</li>
        </ul>

        <h2>3. Known Limitations</h2>
        <p>
          We would rather list these than let you discover them mid-session:
        </p>
        <ul>
          <li>
            <strong>The code editor.</strong> Practice sessions use a full code editor
            (Monaco). Its screen-reader support is limited, and we have not verified it
            against the assistive technologies our users actually use. This is the most
            significant barrier in the Service.
          </li>
          <li>
            <strong>Small screens.</strong> Sessions require a desktop-sized viewport
            because the editor, test runner, and coaching panel appear side by side. The
            Service is not usable for practice on a phone.
          </li>
          <li>
            <strong>The performance review chart.</strong> Scores are shown on a radar
            chart. The same scores are available as text alongside it, but the chart
            itself is not independently described.
          </li>
          <li>
            <strong>Timed sessions.</strong> Timed mode imposes a countdown. Practice mode
            removes the time limit entirely and is available on every scenario.
          </li>
        </ul>

        <h2>4. Requesting an Accommodation</h2>
        <p>
          If any part of the Service prevents you from using it, email{' '}
          <a href="mailto:divjotmuchhal@gmail.com">divjotmuchhal@gmail.com</a> with the
          page or feature involved and the assistive technology you use. We aim to reply
          within five business days.
        </p>
        <p>
          If a barrier prevents you from completing something you paid for, tell us and we
          will make it right, including a refund where we cannot resolve the barrier.
        </p>

        <h2>5. Feedback</h2>
        <p>
          Accessibility work here is ongoing and this statement will change as the Service
          does. Reports of specific barriers are the most useful thing you can send us,
          and we treat them as bugs rather than requests.
        </p>

        <h2>6. Contact</h2>
        <p>
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
