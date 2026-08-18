import React from 'react';
import { Image, type ImageSourcePropType, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { RevealIn } from './RevealIn';

export function ConnectedInfoRow({
  iconSource,
  title,
  connected,
  visible,
  instant,
}: {
  iconSource: ImageSourcePropType;
  title: string;
  connected: boolean;
  visible: boolean;
  instant?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Image source={iconSource} style={styles.connectedServiceIcon} resizeMode="contain" />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <View style={styles.connectedRightSlot}>
        {visible ? (
          <RevealIn duration={instant ? 0 : 460} distance={instant ? 0 : 7}>
            <View style={[styles.statusLight, connected ? styles.statusLightGreen : styles.statusLightRed]} />
          </RevealIn>
        ) : null}
      </View>
    </View>
  );
}
