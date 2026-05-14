import React from 'react';
import {
  BatteryCharging,
  Check,
  CircleDot,
  GraduationCap,
  Hospital,
  ShoppingBasket,
  Utensils,
} from 'lucide-react';

interface AmenityControlsProps {
  numAmenities: number;
  setNumAmenities: (num: number) => void;
  maxNumAmenities: number;
  selectedAmenities: Record<string, boolean>;
  toggleAmenity: (type: string) => void;
  amenityColors: Record<string, string>;
}

const amenityIcons = {
  'EV-Chargers': BatteryCharging,
  Hospitals: Hospital,
  Schools: GraduationCap,
  Restaurants: Utensils,
  Supermarkets: ShoppingBasket,
} as const;

const AmenityControls: React.FC<AmenityControlsProps> = ({
  numAmenities,
  setNumAmenities,
  maxNumAmenities,
  selectedAmenities,
  toggleAmenity,
  amenityColors,
}) => {
  return (
    <div className="space-y-4" data-testid="amenity-controls">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/70 px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
        <span>Show</span>
        <div className="flex min-w-0 items-center justify-between gap-2 min-[380px]:justify-end">
          <input
            type="number"
            min="1"
            max={maxNumAmenities}
            value={numAmenities}
            onChange={(e) => {
              const nextValue = Math.max(1, parseInt(e.target.value, 10) || 1);
              setNumAmenities(Math.min(maxNumAmenities, nextValue));
            }}
            className="h-10 w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            data-testid="amenity-count-input"
            aria-label="Number of nearby amenities per selected type"
          />
          <span className="text-[11px] text-slate-500">nearest each</span>
        </div>
      </div>

      <div className="amenity-button-grid">
        {Object.entries(amenityColors).map(([type, color]) => {
          const isSelected = selectedAmenities[type];
          const Icon = amenityIcons[type as keyof typeof amenityIcons] ?? CircleDot;
          const selectedShadow = `0 16px 34px ${color}40`;

          return (
            <button
              key={type}
              onClick={() => toggleAmenity(type)}
              className={`group relative flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold leading-5 outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] ${
                isSelected
                  ? 'text-white shadow-lg'
                  : 'border-slate-200/80 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md'
              }`}
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: isSelected ? color : undefined,
                boxShadow: isSelected ? selectedShadow : undefined,
                ['--tw-ring-color' as string]: isSelected ? `${color}66` : undefined,
              }}
              data-testid={`amenity-toggle-${type.toLowerCase().replace(/\s+/g, '-')}`}
              aria-pressed={isSelected}
              type="button"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                  isSelected ? 'bg-white/18 ring-1 ring-white/30' : 'bg-slate-50 ring-1 ring-slate-200/80 group-hover:bg-slate-100'
                }`}
                style={{
                  color: isSelected ? '#ffffff' : color,
                }}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </div>
              <span className="min-w-0 flex-1 break-words">{type}</span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                  isSelected ? 'border-white/60 bg-white text-slate-950' : 'border-slate-300 bg-white/70'
                }`}
                style={{
                  color: isSelected ? color : undefined,
                }}
                aria-hidden="true"
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AmenityControls;
