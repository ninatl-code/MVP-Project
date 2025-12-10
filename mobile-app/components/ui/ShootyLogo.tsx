import React from 'react';
import { Image } from 'react-native';

const logo = require('../../assets/images/shooty-logo.png');

// Version simple avec balise img standard (recommandée pour fiabilité)
export function ShootyLogoSimple({ width = 140, height = 45 }) {
  return <Image source={logo} style={{ width, height, resizeMode: 'contain' }} />;
}

export function ShootyLogoCompact({ width = 120, height = 40 }) {
  return <Image source={logo} style={{ width, height, resizeMode: 'contain' }} />;
}

export default ShootyLogoSimple;
