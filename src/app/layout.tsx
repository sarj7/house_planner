import './globals.css';
import type { Metadata } from 'next';
import { Fraunces, Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'House Planner',
  description: 'Find nearby amenities for your home',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
