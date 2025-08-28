import React from 'react';

interface CatLogoProps {
  className?: string;
}

export const CatLogo: React.FC<CatLogoProps> = ({ className = "h-8 w-auto" }) => {
  return (
    <div className={`font-bold text-black ${className}`} style={{ 
      fontFamily: 'Arial Black, sans-serif',
      background: 'linear-gradient(135deg, #FFCC00 0%, #FFA500 100%)',
      padding: '4px 12px',
      borderRadius: '6px',
      border: '2px solid #000',
      boxShadow: '2px 2px 4px rgba(0,0,0,0.3)'
    }}>
      CAT
    </div>
  );
};
