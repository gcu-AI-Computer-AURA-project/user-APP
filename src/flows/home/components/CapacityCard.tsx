import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

export function CapacityCard({
  remainingLabel,
  usageLabel,
  usagePercent,
}: {
  remainingLabel: string;
  usageLabel: string;
  usagePercent: number;
}) {
  return (
    <View style={[styles.card, styles.cardTint, styles.capacityCard]}>
      <View style={styles.capacityCardRow}>
        <View style={styles.infoMain}>
          <Text style={styles.cardLabel}>남은 용량</Text>
          <Text style={styles.bigNumber}>{remainingLabel}</Text>
        </View>
        <View style={styles.capacityUsageBox}>
          <Text style={styles.capacityUsageText}>{usageLabel}</Text>
          <View style={styles.capacityUsageTrack}>
            <View style={[styles.capacityUsageFill, { width: `${usagePercent}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}
