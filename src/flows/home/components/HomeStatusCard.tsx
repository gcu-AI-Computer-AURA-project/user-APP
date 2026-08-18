import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

type HomeStatusBadge = 'running' | 'completed' | 'cancelled';

const badgeLabel: Record<HomeStatusBadge, string> = {
  running: '진행중',
  completed: '완료',
  cancelled: '중지됨',
};

export function HomeStatusCard({
  title,
  desc,
  badge,
  progress,
  primaryTitle,
  onPrimary,
  onCancel,
}: {
  title: string;
  desc: string;
  badge: HomeStatusBadge;
  progress?: number;
  primaryTitle?: string;
  onPrimary?: () => void;
  onCancel?: () => void;
}) {
  const showProgress = progress !== undefined;
  const showActions = Boolean(primaryTitle && onPrimary) || Boolean(onCancel);

  return (
    <View style={[styles.card, styles.homeScanStatusCard]}>
      <View style={styles.rowBetween}>
        <View style={styles.infoMain}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.meta}>{desc}</Text>
        </View>
        <Text style={badge === 'cancelled' ? styles.homeScanBadgeMuted : styles.homeScanBadge}>{badgeLabel[badge]}</Text>
      </View>
      {showProgress ? (
        <View style={styles.miniProgressTrack}>
          <View style={[styles.miniProgressFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
        </View>
      ) : null}
      {showActions ? (
        <View style={styles.scanStatusActions}>
          {primaryTitle && onPrimary ? (
            <Pressable style={styles.scanStatusButton} onPress={onPrimary}>
              <Text style={styles.scanStatusButtonText}>{primaryTitle}</Text>
            </Pressable>
          ) : null}
          {onCancel ? (
            <Pressable style={styles.scanStatusCancel} onPress={onCancel}>
              <Text style={styles.scanStatusCancelText}>취소</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
