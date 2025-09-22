import React from 'react';

const BackgroundGrid = () => {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Soft gray gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1400px 900px at 10% 0%, rgba(220,224,230,1) 0%, rgba(232,236,242,1) 35%, rgba(238,242,248,1) 65%, rgba(244,247,251,1) 85%), radial-gradient(1200px 700px at 100% 100%, rgba(220,224,230,0.6) 0%, rgba(244,247,251,0) 70%)',
        }}
      />

      {/* Dense white grid overlay using SVG pattern for crisp lines */}
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
          </pattern>
          <pattern id="gridLarge" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,1)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#gridLarge)" />
      </svg>

      {/* Subtle vignette to keep focus on content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.04]" />
    </div>
  );
};

export default BackgroundGrid;


