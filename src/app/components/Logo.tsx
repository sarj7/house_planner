import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className={className}
      fill="none"
    >
      {/* Base/Grounding: Pin/Walls */}
      <path 
        d="M 25 45 V 55 L 50 90 L 75 55 V 45" 
        stroke="#141c22" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Primary Accent: Roofline */}
      <path 
        d="M 12 40 L 50 10 L 88 40" 
        stroke="#c6673c" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Secondary Accent: Interconnecting geographic routes */}
      <path 
        d="M 38 65 L 50 50 L 50 35 M 50 50 L 62 65" 
        stroke="#20776f" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Nodes / Intersections */}
      <circle cx="50" cy="35" r="4.5" fill="#20776f" />
      <circle cx="38" cy="65" r="4.5" fill="#20776f" />
      <circle cx="62" cy="65" r="4.5" fill="#20776f" />
      
      {/* Center Focus Node */}
      <circle cx="50" cy="50" r="4.5" fill="#fff" stroke="#20776f" strokeWidth="3" />
    </svg>
  );
}
