import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CarbonStatsGraph } from '../../history';
import { styles } from '../../../styles/appStyles';

function OnboardingMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetricCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.bigNumber}>{value}</Text>
    </View>
  );
}

function OnboardingCategoryCard({ title, desc, warning }: { title: string; desc: string; warning?: string }) {
  return (
    <Pressable style={styles.resultCategoryCard} onPress={() => undefined}>
      <View style={styles.infoMain}>
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <Text style={styles.resultCategoryMeta}>{desc}</Text>
      {warning ? <Text style={styles.resultWarningText}>{warning}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function OnboardingSectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function GhostScanAnimation({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const doneCalled = useRef(false);

  useEffect(() => {
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, skip ? 0 : 450);

    return () => {
      clearTimeout(doneTimer);
    };
  }, [onDone, skip]);

  return (
    <View style={styles.ghostPreviewCard}>
      <Text style={styles.ghostPreviewTitle}>분석 결과 요약</Text>
      <View style={styles.resultMetricGrid}>
        <OnboardingMetricCard label="정리 후보" value="8개" />
        <OnboardingMetricCard label="예상 확보" value="2.1GB" />
      </View>
      <OnboardingCategoryCard title="광고·프로모션 메일" desc="2개 · 93MB" />
      <OnboardingCategoryCard title="오래된 메일" desc="0개 · 0.0MB" />
      <OnboardingCategoryCard title="오래된 파일" desc="5개 · 1.2GB" />
      <OnboardingCategoryCard title="중복 파일" desc="2개 · 2.0GB" warning="미선택 2개" />
      <OnboardingCategoryCard title="대용량 파일" desc="1개 · 760MB" />
    </View>
  );
}

export function CarbonSaveAnimation({ onDone, skip }: { onDone: () => void; skip?: boolean }) {
  const [step, setStep] = useState(skip ? 2 : 0);
  const doneCalled = useRef(false);

  useEffect(() => {
    if (skip) {
      setStep(2);
      return;
    }

    const firstTimer = setTimeout(() => setStep(1), 600);
    const secondTimer = setTimeout(() => setStep(2), 1150);
    const doneTimer = setTimeout(() => {
      if (!doneCalled.current) {
        doneCalled.current = true;
        onDone();
      }
    }, 1850);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(secondTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, skip]);

  return (
    <View style={styles.carbonPreviewCard}>
      <View style={styles.historyTotalMiniCard}>
        <View>
          <Text style={styles.onboardingMetricLabel}>전체 누적 삭제 용량</Text>
          <Text style={styles.historyTotalMiniValue}>{step >= 1 ? '1.8GB' : '...'}</Text>
        </View>
        <View style={styles.historyMiniPill}>
          <Text style={styles.historyMiniPillText}>최근 스캔 +620MB</Text>
        </View>
      </View>
      <OnboardingSectionTitle>누적 확보 용량 현황</OnboardingSectionTitle>
      <CarbonStatsGraph
        sizeLabel="1.8GB"
        values={[240, 520, 980, 1840].map((value) => value * 1024 * 1024)}
        labels={['1회', '2회', '3회', '4회']}
      />
    </View>
  );
}
