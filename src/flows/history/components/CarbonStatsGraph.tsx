import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { styles } from '../../../styles/appStyles';

function sizeLabelToMB(label: string) {
  const value = Number.parseFloat(label.replace(/[^0-9.]/g, '')) || 0;
  const unit = label.toUpperCase();
  if (unit.includes('TB')) return value * 1024 * 1024;
  if (unit.includes('GB')) return value * 1024;
  return value;
}

function getNiceChartTickStep(targetStep: number, suffix: string) {
  if (!Number.isFinite(targetStep) || targetStep <= 0) return 1;

  if ((suffix === 'MB' || suffix === 'GB') && targetStep < 1) {
    return 1;
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
  const normalized = targetStep / magnitude;
  const multipliers = [1, 2, 2.5, 5, 10];
  const multiplier = multipliers.find((candidate) => normalized <= candidate) ?? 10;

  return multiplier * magnitude;
}

function getChartSizeScale(valuesInBytes: number[]) {
  const maxBytes = Math.max(0, ...valuesInBytes.map((value) => Number(value) || 0));
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;
  const unit = maxBytes >= TB
    ? { divisor: TB, suffix: 'TB' }
    : maxBytes >= GB
      ? { divisor: GB, suffix: 'GB' }
      : maxBytes >= MB
        ? { divisor: MB, suffix: 'MB' }
        : maxBytes >= KB
          ? { divisor: KB, suffix: 'KB' }
          : { divisor: 1, suffix: 'B' };
  const maxValue = maxBytes / unit.divisor;
  const tickStep = getNiceChartTickStep(maxValue / 4, unit.suffix);
  const axisMax = maxValue > 0 ? tickStep * 4 : tickStep;
  const decimalPlaces = tickStep >= 1 ? 0 : 1;

  return {
    ...unit,
    axisMax,
    decimalPlaces,
    segments: maxValue > 0 ? 4 : 1,
  };
}

export function CarbonStatsGraph({ sizeLabel, values, labels }: { sizeLabel: string; values?: number[]; labels?: string[] }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const lastAnimatedGraphKey = useRef('');
  const currentBytes = sizeLabelToMB(sizeLabel) * 1024 * 1024;
  const chartWidth = Math.max(260, Dimensions.get('window').width - 96);
  const rawValues = values?.length ? values : [Math.max(0, currentBytes)];
  const chartScale = getChartSizeScale(rawValues);
  const graphKey = `${sizeLabel}|${chartScale.suffix}|${rawValues.join(',')}|${(labels ?? []).join(',')}`;
  const scanValues = rawValues.length === 1
    ? [0, Math.max(0, rawValues[0]) / chartScale.divisor]
    : rawValues.map((value) => Math.max(0, value) / chartScale.divisor);
  const scanLabels = labels?.length === rawValues.length
    ? rawValues.length === 1 ? ['', labels[0]] : labels
    : scanValues.map((_, index) => (index === 0 && rawValues.length === 1 ? '' : `${index + 1}회`));

  useEffect(() => {
    if (lastAnimatedGraphKey.current === graphKey) {
      reveal.setValue(1);
      return undefined;
    }

    lastAnimatedGraphKey.current = graphKey;
    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [graphKey, reveal]);

  const revealWidth = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.statsGraphCard}>
      <View style={styles.statsChartClip}>
        <Animated.View style={[styles.statsChartReveal, { width: revealWidth }]}>
          <LineChart
            data={{
              labels: scanLabels,
              datasets: [{ data: scanValues }],
            }}
            width={chartWidth}
            height={180}
            fromNumber={chartScale.axisMax}
            yAxisSuffix={chartScale.suffix}
            yLabelsOffset={8}
            chartConfig={{
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              color: (opacity = 1) => `rgba(82, 190, 116, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(120, 129, 134, ${opacity})`,
              decimalPlaces: chartScale.decimalPlaces,
              propsForBackgroundLines: {
                stroke: '#E8ECEF',
                strokeDasharray: '',
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#52BE74',
              },
            }}
            bezier
            fromZero
            segments={chartScale.segments}
            withOuterLines={false}
            withVerticalLines={false}
            style={styles.statsLineChart}
          />
        </Animated.View>
      </View>
    </View>
  );
}
