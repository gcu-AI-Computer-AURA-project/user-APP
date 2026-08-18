import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { styles } from '../../../styles/appStyles';
import { mutedText } from '../../../styles/theme';

export function RecentAnalysisSummaryCard({
  hasLastScan,
  dateLabel,
  sourceLabel,
  summarySizeLabel,
  trashIcon,
  onPress,
  onTrashPress,
}: {
  hasLastScan: boolean;
  dateLabel?: string;
  sourceLabel?: string;
  summarySizeLabel: string;
  trashIcon: React.ReactNode;
  onPress: () => void;
  onTrashPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.card, styles.cardTint, styles.homeSummaryCard]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>최근 분석 요약</Text>
          <View style={styles.homeDetailAction}>
            <View style={styles.homeDetailPill}>
              <Text style={styles.homeDetailText}>상세</Text>
            </View>
            <Text style={styles.homeChevron}>›</Text>
          </View>
        </View>
        {hasLastScan ? (
          <>
            <Text style={styles.meta}>
              마지막 스캔 {dateLabel} · {sourceLabel}
            </Text>
            <View style={styles.divider} />
            <View style={styles.homeSummaryCapacityRow}>
              <View style={styles.infoMain}>
                <Text style={styles.homeSummaryCapacityLabel} numberOfLines={1}>확보용량</Text>
                <Text style={styles.homeSummaryValue}>{summarySizeLabel}</Text>
              </View>
              <Pressable
                style={styles.homeTrashIconButton}
                onPress={(event) => {
                  event.stopPropagation();
                  onTrashPress();
                }}
              >
                {trashIcon}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.homeEmptySummary}>
            <Feather name="clock" size={42} color={mutedText} />
            <Text style={styles.homeEmptyTitle}>아직 분석 기록이 없어요</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
