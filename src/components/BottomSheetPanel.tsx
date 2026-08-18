import React, { useRef } from 'react';
import { Animated, PanResponder, type StyleProp, type ViewStyle } from 'react-native';

export function BottomSheetPanel({
  motion,
  outputRange,
  style,
  onClose,
  children,
  dragScope = 'panel',
}: {
  motion: Animated.Value;
  outputRange: [number, number];
  style: StyleProp<ViewStyle>;
  onClose: () => void;
  children: React.ReactNode;
  dragScope?: 'handle' | 'panel';
}) {
  const dragY = useRef(new Animated.Value(0)).current;
  const canStartDrag = (_: unknown, gesture: { dx: number; dy: number }) =>
    Math.abs(gesture.dy) > 6 &&
    Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2 &&
    (dragScope === 'handle' || gesture.dy > 0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => dragScope === 'handle',
      onMoveShouldSetPanResponder: canStartDrag,
      onMoveShouldSetPanResponderCapture: canStartDrag,
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 72 || (gesture.dy > 28 && gesture.vy > 0.95)) {
          onClose();
          return;
        }
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;
  const baseTranslateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange,
  });
  const translateY = Animated.add(baseTranslateY, dragY);
  const panelPanHandlers = dragScope === 'panel' ? panResponder.panHandlers : {};

  return (
    <Animated.View style={[style, { transform: [{ translateY }] }]} {...panelPanHandlers}>
      {children}
    </Animated.View>
  );
}
