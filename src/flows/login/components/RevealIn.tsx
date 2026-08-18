import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export function RevealIn({
  children,
  style,
  duration = 260,
  distance = 8,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  distance?: number;
}) {
  const motion = useRef(new Animated.Value(duration === 0 ? 1 : 0)).current;

  useEffect(() => {
    if (duration === 0) {
      motion.setValue(1);
      return;
    }

    motion.setValue(0);
    Animated.timing(motion, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [distance, duration, motion]);

  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View style={[style, { opacity: motion, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
