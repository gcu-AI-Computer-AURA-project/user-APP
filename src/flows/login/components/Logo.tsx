import React from 'react';
import { Image } from 'react-native';

import { styles } from '../../../styles/appStyles';

const auraLogo = require('../../../../assets/AURA-logo.png');

export function Logo({ large, medium }: { large?: boolean; medium?: boolean }) {
  return (
    <Image source={auraLogo} style={[styles.logoImage, medium && styles.logoImageMedium, large && styles.logoImageLarge]} resizeMode="contain" />
  );
}
