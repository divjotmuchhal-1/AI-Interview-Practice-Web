import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const TITLE = 'AI OA & Coding Interview Prep: Debug Real Code with an AI Coach';
const DESCRIPTION =
  'Practice the new style of technical assessments. Debug real broken code, work with an AI coach that will not hand you the answer, and get scored on how you actually work. 36 scenarios across Python, JavaScript, TypeScript, SQL, React, and multi-file systems.';

export const metadata: Metadata = {
  metadataBase: new URL('https://aicodingprep.com'),
  title: {
    default: TITLE,
    // Sub-pages set their own title; this keeps the brand attached.
    template: '%s | AI Interview Practice',
  },
  description: DESCRIPTION,
  keywords: [
    'AI OA prep', 'AI online assessment', 'coding interview practice',
    'debugging interview practice', 'technical screen prep', 'OA practice',
    'AI-assisted coding interview', 'software engineering interview prep',
  ],
  alternates: { canonical: 'https://aicodingprep.com' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://aicodingprep.com',
    siteName: 'AI Interview Practice',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Structured data: describes the product to search engines. Claims here
            must stay factually true, so no ratings or review counts. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AI Interview Practice',
              url: 'https://aicodingprep.com',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              description: DESCRIPTION,
              offers: [
                { '@type': 'Offer', name: 'Free',  price: '0', priceCurrency: 'USD' },
                { '@type': 'Offer', name: 'Pro',   price: '9', priceCurrency: 'USD' },
              ],
            }),
          }}
        />
        {children}
        {/* Page views and funnel data. No cookies, no config needed on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
