'use client';

import dynamic from 'next/dynamic';

const HousePlanner = dynamic(() => import('@/app/components/HousePlanner'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-300 to-amber-700 flex items-center justify-center">
      <div className="text-2xl font-bold text-white">Loading Map...</div>
    </div>
  )
});

export default function Home() {
  return <HousePlanner />;
}

