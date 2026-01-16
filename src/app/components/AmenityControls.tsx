import React, { useCallback } from 'react';

interface AmenityControlsProps {
  numAmenities: number;
  setNumAmenities: (num: number) => void;
  selectedAmenities: Record<string, boolean>;
  toggleAmenity: (type: string) => void;
  amenityColors: Record<string, string>;
}

const AmenityControls: React.FC<AmenityControlsProps> = ({ 
  numAmenities, 
  setNumAmenities, 
  selectedAmenities, 
  toggleAmenity, 
  amenityColors 
}) => {
  return (
    <div className="mb-4" data-testid="amenity-controls">
      <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-md border border-white/20">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-2 bg-gray-50/80 rounded-lg p-2">
            <span className="text-sm font-medium text-gray-700">Show</span>
            <input
              type="number"
              min="1"
              max="20"
              value={numAmenities}
              onChange={(e) => setNumAmenities(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded-md border border-gray-200 text-center text-gray-900 text-sm 
                      focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
              data-testid="amenity-count-input"
            />
            <span className="text-sm font-medium text-gray-700">nearest</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(amenityColors).map(([type, color]) => {
              const isSelected = selectedAmenities[type];
              return (
                <button
                  key={type}
                  onClick={() => toggleAmenity(type)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 
                    ${isSelected ? 'shadow-md' : 'hover:bg-gray-50'}
                  `}
                  style={{ 
                    backgroundColor: isSelected ? color : 'white',
                    border: `2px solid ${color}`,
                  }}
                  data-testid={`amenity-toggle-${type.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-pressed={isSelected}
                  type="button"
                >
                  <div 
                    className="w-4 h-4 rounded-md flex items-center justify-center transition-colors duration-200"
                    style={{ 
                      border: `1px solid ${isSelected ? 'white' : color}`,
                      backgroundColor: isSelected ? 'white' : 'transparent'
                    }}
                  >
                    {isSelected && (
                      <div 
                        className="w-2 h-2 rounded-sm" 
                        style={{ backgroundColor: color }}
                      />
                    )}
                  </div>
                  <span className={`
                    text-sm font-medium truncate
                    ${isSelected ? 'text-white' : 'text-gray-700'}
                  `}>
                    {type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmenityControls;
