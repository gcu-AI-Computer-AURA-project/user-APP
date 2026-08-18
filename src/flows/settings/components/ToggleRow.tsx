import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { navy } from '../../../styles/theme';

export function ToggleRow({
  title,
  desc,
  value,
  onPress,
  plain,
  tint,
}: {
  title: string;
  desc?: string;
  value: boolean;
  onPress: () => void;
  plain?: boolean;
  tint?: boolean;
}) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 230,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const knobTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#DFF6E6', navy],
  });

  return (
    <Pressable style={[styles.toggleRow, plain && styles.toggleRowPlain, tint && styles.toggleRowTint]} onPress={onPress}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
        {desc ? <Text style={styles.infoDesc}>{desc}</Text> : null}
      </View>
      <Animated.View style={[styles.toggle, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.toggleKnob, { transform: [{ translateX: knobTranslate }] }]} />
      </Animated.View>
    </Pressable>
  );
}
