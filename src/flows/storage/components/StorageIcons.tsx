import React from 'react';
import { View } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { styles } from '../../../styles/appStyles';
import { mutedText, navy } from '../../../styles/theme';

type FontAwesome5Name = React.ComponentProps<typeof FontAwesome5>['name'];

export function FolderOutlineIcon() {
  return (
    <View style={styles.fileIconFrame}>
      <FontAwesome5 name="folder" size={28} color={navy} />
    </View>
  );
}

export function FileOutlineIcon({ type }: { type: string }) {
  const normalizedType = type.toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'SVG'].includes(normalizedType);
  const isArchive = ['ZIP', 'RAR', '7Z'].includes(normalizedType);
  const isPdf = normalizedType === 'PDF';
  const isWord = ['HWP', 'DOC', 'DOCX'].includes(normalizedType);
  const iconName: FontAwesome5Name = isImage
    ? 'file-image'
    : isArchive
      ? 'file-archive'
      : isPdf
        ? 'file-pdf'
        : isWord
          ? 'file-alt'
          : 'file';

  return (
    <View style={styles.fileIconFrame}>
      <FontAwesome5 name={iconName} size={26} color={navy} solid={isArchive} />
    </View>
  );
}

export function TrashOutlineIcon({ danger, muted, compact }: { danger?: boolean; muted?: boolean; compact?: boolean }) {
  return (
    <View style={[styles.fileIconFrame, compact && styles.fileIconFrameCompact]}>
      <FontAwesome5 name="trash-alt" size={compact ? 21 : 24} color={danger ? '#D95050' : muted ? mutedText : navy} solid={danger} />
    </View>
  );
}
