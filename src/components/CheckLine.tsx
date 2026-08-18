import React from 'react';
import { Pressable, Text } from 'react-native';

import { styles } from '../styles/appStyles';
import { CheckBox } from './CheckBox';

export function CheckLine({ label, checked, onPress }: { label: string; checked?: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.checkLine} onPress={onPress}>
      <CheckBox checked={Boolean(checked)} onPress={onPress} />
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );
}
