import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import { styles } from '../../styles/appStyles';
import { mutedText, navy } from '../../styles/theme';

export function MailBodyCard({ bodyText, loading }: { bodyText?: string; loading?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const previewLineCount = 6;
  const fallbackText = loading ? '메일 본문 미리보기를 불러오는 중...' : '메일 본문 미리보기를 불러오지 못했어요.';
  const displayText = bodyText ?? fallbackText;
  const canExpand = Boolean(bodyText && (bodyText.length > 160 || bodyText.split(/\r\n|\r|\n/).length > previewLineCount));

  return (
    <View style={[styles.mailBodyCard, expanded && styles.mailBodyCardExpanded]}>
      <Text style={styles.mailBodyText} numberOfLines={expanded ? undefined : previewLineCount} ellipsizeMode="tail">
        {displayText}
      </Text>
      {canExpand ? (
        <Pressable
          style={styles.mailBodyExpandButton}
          onPress={() => setExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? '메일 미리보기 접기' : '메일 미리보기 펼치기'}
          hitSlop={8}
        >
          <FontAwesome5 name="ellipsis-v" size={18} color={mutedText} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function DriveLinkCard({ webViewLink, loading }: { webViewLink?: string; loading?: boolean }) {
  const openDriveLink = () => {
    if (!webViewLink) return;
    void Linking.openURL(webViewLink).catch(() => undefined);
  };

  return (
    <View style={styles.driveLinkCard}>
      <Pressable
        style={[styles.driveLinkIconButton, !webViewLink && styles.driveLinkIconButtonDisabled]}
        onPress={openDriveLink}
        disabled={!webViewLink}
        accessibilityRole="link"
      >
        <FontAwesome5 name="external-link-alt" size={30} color={webViewLink ? navy : mutedText} />
      </Pressable>
      <Text style={styles.driveLinkTitle}>Google Drive에서 열기</Text>
      <Text style={styles.driveLinkDesc}>
        {webViewLink ? '파일 미리보기를 Drive에서 확인할 수 있어요.' : loading ? 'Drive 링크를 확인하는 중이에요.' : 'Drive 링크를 찾을 수 없어요.'}
      </Text>
    </View>
  );
}
