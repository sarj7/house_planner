import React from 'react';

// Simple loading component shown in a corner of the map during data fetch.
const LoadingCorner = () => {
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
        {/* Animated spinner */}
        <div className="animate-spin w-5 h-5 border-3 border-amber-500 border-t-transparent rounded-full"></div>
        <span className="text-sm font-medium text-gray-700">Loading results...</span>
      </div>
    </div>
  );
};

export default LoadingCorner;
