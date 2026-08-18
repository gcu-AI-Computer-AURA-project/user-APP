import React from 'react';
import { Pressable, Text } from 'react-native';

import { styles } from '../styles/appStyles';

export function PrimaryButton({ title, onPress, half, inline }: { title: string; onPress: () => void; half?: boolean; inline?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, !half && !inline && styles.primaryButtonLower, half && styles.halfButton]} onPress={onPress}>
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, half, danger }: { title: string; onPress: () => void; half?: boolean; danger?: boolean }) {
  return (
    <Pressable style={[styles.outlineButton, danger && styles.outlineButtonDanger, half && styles.halfButton]} onPress={onPress}>
      <Text style={[styles.outlineText, danger && styles.outlineTextDanger]}>{title}</Text>
    </Pressable>
  );
}
