import React from 'react';

const LoadingCorner = () => {
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-700">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingCorner;
