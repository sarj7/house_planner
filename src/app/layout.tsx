import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'House Planner',
  description: 'Find nearby amenities for your home',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
