import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { line, navy } from '../../../styles/theme';

export function ConnectedSuccessIcon({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const [progress, setProgress] = useState(skip ? 100 : 0);
  const [completed, setCompleted] = useState(Boolean(skip));
  const rotate = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const doneCalled = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (skip) {
      setProgress(100);
      setCompleted(true);
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDoneRef.current();
      }
      return;
    }

    doneCalled.current = false;
    setProgress(0);
    setCompleted(false);
    rotate.setValue(0);
    bounce.setValue(0);

    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 420,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    spin.start();

    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      const next = Math.min(100, Math.round((frame / 12) * 100));
      setProgress(next);

      if (next >= 100) {
        clearInterval(interval);
        spin.stop();
        setCompleted(true);
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: -8,
            duration: 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.spring(bounce, {
            toValue: 0,
            friction: 4,
            tension: 90,
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (!doneCalled.current) {
            doneCalled.current = true;
            onDoneRef.current();
          }
        });
      }
    }, 38);

    return () => {
      clearInterval(interval);
      spin.stop();
    };
  }, [bounce, rotate, skip]);

  const spinValue = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.connectedIconWrap}>
      <Animated.View
        style={[
          styles.connectedRing,
          {
            borderTopColor: navy,
            borderRightColor: progress >= 34 ? navy : line,
            borderBottomColor: progress >= 67 ? navy : line,
            borderLeftColor: progress >= 100 ? navy : line,
            transform: [{ rotate: spinValue }],
          },
        ]}
      />
      <Animated.View style={[styles.connectedIconInner, { transform: [{ translateY: bounce }] }]}>
        <Text style={completed ? styles.connectedCheckText : styles.connectedProgressText}>
          {completed ? '✓' : `${progress}%`}
        </Text>
      </Animated.View>
    </View>
  );
}
