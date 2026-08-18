import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

export function RecentResultRow({ title, desc, value }: { title: string; desc?: string; value: string }) {
  return (
    <View style={styles.recentResultRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <Text style={styles.recentResultValue}>{value}</Text>
    </View>
  );
}
