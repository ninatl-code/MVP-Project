import React from 'react';
import { Image } from 'react-native';

const logo = require('../../assets/images/Bricool-logo.png');

// Version simple avec balise img standard (recommandée pour fiabilité)
export function BricoolLogoSimple({ width = 140, height = 45 }) {
  return <Image source={logo} style={{ width, height, resizeMode: 'contain' }} />;
}

export function BricoolLogoCompact({ width = 120, height = 40 }) {
  return <Image source={logo} style={{ width, height, resizeMode: 'contain' }} />;
}

// Aliases rétro-compatibles
export const ShootyLogoSimple = BricoolLogoSimple;
export const ShootyLogoCompact = BricoolLogoCompact;

export default BricoolLogoSimple;