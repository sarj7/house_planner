import React from 'react';

interface DebugPanelProps {
  selectedAmenities: Record<string, boolean>;
  visible?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ selectedAmenities, visible = true }) => {
  if (!visible) return null;
  
  const selectedCount = Object.values(selectedAmenities).filter(Boolean).length;
  
  return (
    <div className="mt-2 p-2 bg-black/10 text-xs rounded">
      <div className="font-bold mb-1">Debug Info:</div>
      <div>Selected count: {selectedCount}</div>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(selectedAmenities).map(([name, isSelected]) => (
          <div key={name} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{name}: {String(isSelected)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;
