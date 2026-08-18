import React from 'react';
import { Pressable, Text } from 'react-native';

import { styles } from '../styles/appStyles';

export function CheckBox({ checked, onPress, compact }: { checked: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      style={[styles.checkbox, compact && styles.checkboxCompact, checked && styles.checkboxChecked]}
    >
      {checked ? <Text style={[styles.checkMark, compact && styles.checkMarkCompact]}>✓</Text> : null}
    </Pressable>
  );
}
