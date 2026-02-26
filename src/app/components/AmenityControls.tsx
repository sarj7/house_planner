import React from 'react';

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
    <div className="space-y-4" data-testid="amenity-controls">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        <span>Show</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="20"
            value={numAmenities}
            onChange={(e) => {
              const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
              setNumAmenities(Math.min(20, nextValue));
            }}
            className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            data-testid="amenity-count-input"
          />
          <span className="text-[11px] text-slate-500">nearest each</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(amenityColors).map(([type, color]) => {
          const isSelected = selectedAmenities[type];
          return (
            <button
              key={type}
              onClick={() => toggleAmenity(type)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                isSelected ? 'text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: color,
              }}
              data-testid={`amenity-toggle-${type.toLowerCase().replace(/\s+/g, '-')}`}
              aria-pressed={isSelected}
              type="button"
            >
              <div
                className="flex h-4 w-4 items-center justify-center rounded-md border"
                style={{
                  borderColor: isSelected ? 'rgba(255,255,255,0.7)' : color,
                  backgroundColor: isSelected ? 'white' : 'transparent',
                }}
              >
                {isSelected && <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />}
              </div>
              <span className="truncate">{type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AmenityControls;
