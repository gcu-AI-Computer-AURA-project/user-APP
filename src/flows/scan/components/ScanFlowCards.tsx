import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { CheckBox } from '../../../components/CheckBox';
import { FolderOutlineIcon } from '../../storage';
import { styles } from '../../../styles/appStyles';

const gmailIcon = require('../../../../assets/gmail-icon.png');
const googleDriveIcon = require('../../../../assets/google-drive-icon.png');

export function ScanSourceCard({
  title,
  desc,
  checked,
  detail,
  onPress,
  onDetailPress,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  detail?: string;
  onPress: () => void;
  onDetailPress?: () => void;
}) {
  return (
    <Pressable style={[styles.scanSourceCard, checked && styles.scanSourceCardSelected]} onPress={onPress}>
      <CheckBox checked={checked} onPress={onPress} compact />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      {detail ? (
        <Pressable onPress={onDetailPress ?? onPress} hitSlop={10}>
          <Text style={styles.rowRight}>{detail} ›</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function FolderRow({
  title,
  desc,
  selected,
  canOpen,
  onPress,
  onOpen,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  canOpen?: boolean;
  onPress: () => void;
  onOpen?: () => void;
}) {
  return (
    <Pressable style={[styles.folderRow, selected && styles.folderRowSelected]} onPress={onPress}>
      <CheckBox checked={selected} onPress={onPress} compact />
      <FolderOutlineIcon />
      <View style={styles.infoMain}>
        <View style={styles.folderTitleLine}>
          <Text style={styles.folderTitleText} numberOfLines={1}>{title}</Text>
          {desc ? <Text style={styles.folderSizeText}>{desc}</Text> : null}
        </View>
      </View>
      {canOpen ? (
        <Pressable style={styles.folderNavigateButton} onPress={onOpen ?? onPress} hitSlop={8}>
          <Text style={styles.folderNavigateText}>›</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function MonthConditionRow({
  title,
  periodText,
  onPress,
}: {
  title: string;
  periodText: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.monthConditionRow} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{periodText}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function ResultMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetricCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.bigNumber}>{value}</Text>
    </View>
  );
}

export function ResultCategoryCard({
  title,
  desc,
  warning,
  onPress,
}: {
  title: string;
  desc: string;
  warning?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.resultCategoryCard} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {warning ? <Text style={styles.resultWarningText}>{warning}</Text> : null}
      </View>
      <Text style={styles.resultCategoryMeta}>{desc}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function HighlightNumberText({ text: value }: { text: string }) {
  const parts = value.split(/(\d+(?:\.\d+)?(?:개|GB|MB)?)/g);
  return (
    <Text style={styles.infoDesc}>
      {parts.map((part, index) =>
        /^\d/.test(part) ? (
          <Text key={`${part}-${index}`} style={styles.reviewRedNumber}>
            {part}
          </Text>
        ) : (
          <Text key={`${part}-${index}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export function ReviewSummaryCard({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.reviewSummaryCard}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        <HighlightNumberText text={desc} />
      </View>
    </View>
  );
}

export function DeleteStatusRow({
  service,
  title,
  desc,
  status,
  done,
}: {
  service: 'gmail' | 'drive';
  title: string;
  desc?: string;
  status: string;
  done?: boolean;
}) {
  const iconSource = service === 'gmail' ? gmailIcon : googleDriveIcon;

  return (
    <View style={styles.deleteStatusRow}>
      <Image source={iconSource} style={styles.deleteStatusServiceIcon} resizeMode="contain" />
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <View style={[styles.statusLight, done ? styles.statusLightGreen : styles.statusLightYellow]} />
      <Text style={styles.deleteStatusText}>{status}</Text>
    </View>
  );
}

export function CleanupMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cleanupMetricCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cleanupMetricValue}>{value}</Text>
    </View>
  );
}

export function CarbonBasisLine({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <View style={styles.carbonBasisLine}>
      <View style={styles.infoMain}>
        <Text style={styles.carbonBasisLineTitle}>{title}</Text>
        <Text style={styles.carbonBasisLineDesc}>{desc}</Text>
      </View>
      <Text style={styles.carbonBasisLineValue}>{value}</Text>
    </View>
  );
}
