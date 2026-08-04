import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Interview Practice',
  description: 'Sharpen your AI-assisted coding skills with real interview formats.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
