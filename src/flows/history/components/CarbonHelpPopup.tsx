import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

export function CarbonHelpPopup({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.helpPopupOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.carbonHelpPopupCard}>
        <Text style={styles.carbonHelpTitle}>월간 예상 절감량 계산식</Text>
        <Text style={styles.carbonFormulaText}>삭제 용량 × 저장 전력 × PUE</Text>
        <Text style={styles.carbonFormulaText}>× 전력 배출계수 × 730시간</Text>
      </View>
    </View>
  );
}
