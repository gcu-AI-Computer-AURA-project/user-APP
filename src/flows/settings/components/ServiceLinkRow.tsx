import React from 'react';
import { ActivityIndicator, Image, type ImageSourcePropType, Pressable, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { navy } from '../../../styles/theme';

export function ServiceLinkRow({
  iconSource,
  title,
  connected,
  checking,
  onPress,
}: {
  iconSource: ImageSourcePropType;
  title: string;
  connected: boolean;
  checking?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.serviceLinkRow} onPress={onPress}>
      <View style={styles.serviceIconBox}>
        <Image source={iconSource} style={styles.serviceIconImage} resizeMode="contain" />
      </View>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {checking ? (
          <View style={styles.connectedCheckingRow}>
            <ActivityIndicator size="small" color={navy} />
            <Text style={styles.connectedCheckingText}>확인 중</Text>
          </View>
        ) : (
          <View style={[styles.connectedPill, !connected && styles.disconnectedPill]}>
            <Text style={[styles.connectedPillText, !connected && styles.disconnectedPillText]}>
              {connected ? '연결됨' : '연결 안됨'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
