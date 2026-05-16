import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Amenity Map | House Planner',
  description: 'Use the interactive map to pin locations, select amenities, and calculate real walking routes and time estimates instantly.',
  alternates: {
    canonical: '/map',
  },
  openGraph: {
    title: 'Interactive Amenity Map | House Planner',
    description: 'Pin locations and calculate real walking routes and time estimates instantly.',
    url: 'https://houseplanner.example.com/map',
  },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
