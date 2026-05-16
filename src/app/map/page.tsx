import dynamic from 'next/dynamic';
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

const HousePlanner = dynamic(() => import('@/app/components/HousePlanner'), {
  ssr: false,
  loading: () => (
    <div className="app-shell flex min-h-screen items-center justify-center px-6 text-center">
      <div className="rounded-3xl bg-white/90 px-8 py-6 shadow-xl">
        <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500">House Planner</div>
        <div className="mt-2 font-display text-2xl text-slate-900">Mapping the neighborhood...</div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 delay-75"></span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300 delay-150"></span>
        </div>
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <main>
      <HousePlanner />
    </main>
  );
}
