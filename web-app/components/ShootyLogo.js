import React from 'react';

// Version simple avec balise img standard (recommandée pour fiabilité)
export function ShootyLogoSimple({ width = 140, height = 45, className = '' }) {
  return (
    <img 
      src="/shooty-logo.svg" 
      alt="Shooty"
      width={width}
      height={height}
      className={className}
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        objectFit: 'contain'
      }}
    />
  );
}

// Version compacte pour les espaces restreints
export function ShootyLogoCompact({ width = 120, height = 40 }) {
  return (
    <img 
      src="/shooty-logo.svg" 
      alt="Shooty"
      width={width}
      height={height}
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        objectFit: 'contain'
      }}
    />
  );
}

// Version par défaut
export default ShootyLogoSimple;
