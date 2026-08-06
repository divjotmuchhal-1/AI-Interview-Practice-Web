import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://aicodingprep.com'),
  title: 'AI Interview Practice',
  description: 'Sharpen your AI-assisted coding skills with real interview formats.',
  openGraph: {
    title: 'AI Interview Practice',
    description: 'Debug real broken code with an AI coach that refuses to hand you the answer.',
    url: 'https://aicodingprep.com',
    siteName: 'AI Interview Practice',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Interview Practice',
    description: 'Debug real broken code with an AI coach that refuses to hand you the answer.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Page views and funnel data. No cookies, no config needed on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
