import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'House Planner | Real Walking Route & Amenity Analysis',
  description: 'Evaluate real estate and neighborhoods with absolute precision. Get real walking routes and accurate time estimates to nearby schools, hospitals, and amenities.',
  keywords: ['house planner', 'real estate tool', 'neighborhood walkability', 'amenity map', 'property analysis', 'walking routes'],
  authors: [{ name: 'House Planner' }],
  metadataBase: new URL('https://houseplanner.example.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'House Planner | Real Walking Route & Amenity Analysis',
    description: 'Evaluate real estate and neighborhoods with absolute precision. Get real walking routes and accurate time estimates to nearby amenities.',
    url: 'https://houseplanner.example.com',
    siteName: 'House Planner',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'House Planner App Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'House Planner | Walkability & Amenity Map',
    description: 'Discover nearby amenities with real walking routes and time estimates.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
