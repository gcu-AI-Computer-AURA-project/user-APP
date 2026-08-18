import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';

export function Card({ children, tint, style }: { children: React.ReactNode; tint?: boolean; style?: object }) {
  return <View style={[styles.card, tint && styles.cardTint, style]}>{children}</View>;
}

export function InfoRow({
  title,
  desc,
  right,
  onPress,
  hideChevron,
}: {
  title: string;
  desc?: string;
  right?: string;
  onPress?: () => void;
  hideChevron?: boolean;
}) {
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      {hideChevron ? null : right ? <Text style={styles.rowRight}>{right}</Text> : <Text style={styles.chevron}>›</Text>}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function PrivacyBody({ children }: { children: React.ReactNode }) {
  return <Text style={styles.privacyBody}>{children}</Text>;
}

export function Chip({
  label,
  removable,
  selected,
  onPress,
  onRemove,
}: {
  label: string;
  removable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  if (removable) {
    return (
      <Pressable style={[styles.chip, styles.removableChip]} onPress={onRemove}>
        <Text style={styles.chipText}>{label}</Text>
        <Text style={styles.removeChipText}>×</Text>
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function PreviewCard({ label }: { label: string }) {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIcon}>
        <Text style={styles.emptyStateIconText}>–</Text>
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateDesc}>{desc}</Text>
    </View>
  );
}
