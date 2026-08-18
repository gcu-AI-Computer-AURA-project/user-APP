import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BottomSheetPanel } from '../../../components/BottomSheetPanel';
import { PrimaryButton } from '../../../components/AppButtons';
import { styles } from '../../../styles/appStyles';
import { mutedText } from '../../../styles/theme';

type MonthRange = { from: number; to: number };

const toMonthIndex = (year: number, month: number) => year * 12 + month - 1;
const nowForScanRange = new Date();
const minScanMonthIndex = toMonthIndex(2018, 2);
const maxScanMonthIndex = toMonthIndex(nowForScanRange.getFullYear(), nowForScanRange.getMonth() + 1);
const clampScanMonth = (monthIndex: number) => Math.max(minScanMonthIndex, Math.min(maxScanMonthIndex, monthIndex));
const getMonthParts = (monthIndex: number) => ({
  year: Math.floor(monthIndex / 12),
  month: (monthIndex % 12) + 1,
});
const formatMonthLabel = (monthIndex: number) => {
  const { year, month } = getMonthParts(monthIndex);
  return `${year}년 ${`${month}`.padStart(2, '0')}월`;
};
const formatMonthShortLabel = (monthIndex: number) => {
  const { year, month } = getMonthParts(monthIndex);
  return `${`${year}`.slice(2)}.${`${month}`.padStart(2, '0')}`;
};

function SheetSectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SheetChip({
  label,
  removable,
  selected,
  onPress,
  onRemove,
}: {
  label: string;
  removable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  if (removable) {
    return (
      <Pressable style={[styles.chip, styles.removableChip]} onPress={onRemove}>
        <Text style={styles.chipText}>{label}</Text>
        <Text style={styles.removeChipText}>×</Text>
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function KeywordBottomSheet({
  type,
  motion,
  input,
  setInput,
  keywords,
  recommended,
  onAddInput,
  onAddRecommended,
  onRemove,
  onClose,
}: {
  type: 'include' | 'exclude';
  motion: Animated.Value;
  input: string;
  setInput: (value: string) => void;
  keywords: string[];
  recommended: string[];
  onAddInput: () => void;
  onAddRecommended: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClose: () => void;
}) {
  const isInclude = type === 'include';
  const handleClose = () => {
    if (input.trim()) onAddInput();
    onClose();
  };

  return (
    <Animated.View style={[styles.sheetOverlay, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKeyboardAvoider}>
        <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.keywordSheet} onClose={handleClose}>
          <Text style={styles.modalTitle}>{isInclude ? '포함 키워드 설정' : '제외 키워드 설정'}</Text>
          <Text style={[styles.infoDesc, styles.keywordSheetDesc]}>
            {isInclude ? '해당 키워드가 있는 항목을 정리 후보에 포함합니다.' : '해당 키워드가 있는 항목을 정리 후보에서 보호합니다.'}
          </Text>
          <View style={styles.inputRow}>
            <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor={mutedText} style={styles.input} />
            <Pressable style={styles.addButton} onPress={onAddInput}>
              <Text style={styles.addButtonText}>추가</Text>
            </Pressable>
          </View>
          <SheetSectionTitle>현재 키워드</SheetSectionTitle>
          <View style={styles.chipWrap}>
            {keywords.map((keyword) => (
              <SheetChip key={keyword} label={keyword} removable onRemove={() => onRemove(keyword)} />
            ))}
          </View>
          <SheetSectionTitle>추천 키워드</SheetSectionTitle>
          <View style={styles.chipWrap}>
            {recommended.map((keyword) => (
              <Pressable key={keyword} style={styles.recommendChip} onPress={() => onAddRecommended(keyword)}>
                <Text style={styles.recommendChipText}>+ {keyword}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton title={isInclude ? '포함 키워드 적용' : '제외 키워드 적용'} onPress={handleClose} inline />
        </BottomSheetPanel>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

export function PeriodMonthSheet({
  type,
  motion,
  months,
  onChange,
  onClose,
}: {
  type: 'opened' | 'modified';
  motion: Animated.Value;
  months: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const [draftMonths, setDraftMonths] = useState(months);
  const [yearText, setYearText] = useState(`${Math.floor(months / 12)}`);
  const [monthText, setMonthText] = useState(`${months % 12}`);
  const title = type === 'opened' ? '마지막으로 연 날짜' : '마지막 수정일';
  const onlyNumber = (value: string) => value.replace(/[^0-9]/g, '');
  const clampMonths = (value: number) => Math.max(1, Math.min(120, value));
  const syncDraft = (value: number, commit = false) => {
    const nextValue = clampMonths(value);
    setDraftMonths(nextValue);
    setYearText(`${Math.floor(nextValue / 12)}`);
    setMonthText(`${nextValue % 12}`);
    if (commit) onChange(nextValue);
  };
  const commitTypedValue = () => {
    const years = Number.parseInt(yearText, 10) || 0;
    const restMonths = Number.parseInt(monthText, 10) || 0;
    syncDraft(years * 12 + Math.min(11, restMonths), true);
  };
  const applyValue = () => {
    const years = Number.parseInt(yearText, 10) || 0;
    const restMonths = Number.parseInt(monthText, 10) || 0;
    onChange(clampMonths(years * 12 + Math.min(11, restMonths)));
    onClose();
  };

  useEffect(() => {
    syncDraft(months);
  }, [months]);

  return (
    <Animated.View style={[styles.sheetOverlay, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKeyboardAvoider}>
        <BottomSheetPanel motion={motion} outputRange={[0, 340]} style={styles.periodMonthSheet} onClose={onClose}>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.periodMonthControl}>
            <Pressable style={styles.monthStepButton} onPress={() => syncDraft(draftMonths - 1, true)}>
              <Text style={styles.monthStepText}>-</Text>
            </Pressable>
            <View style={styles.periodMonthInputGroup}>
              <TextInput style={styles.periodMonthInput} value={yearText} onChangeText={(value) => setYearText(onlyNumber(value).slice(0, 2))} onBlur={commitTypedValue} keyboardType="number-pad" maxLength={2} selectTextOnFocus />
              <Text style={styles.periodUnit}>년</Text>
              <TextInput style={styles.periodMonthInput} value={monthText} onChangeText={(value) => setMonthText(onlyNumber(value).slice(0, 2))} onBlur={commitTypedValue} keyboardType="number-pad" maxLength={2} selectTextOnFocus />
              <Text style={styles.periodUnit}>개월</Text>
            </View>
            <Pressable style={styles.monthStepButton} onPress={() => syncDraft(draftMonths + 1, true)}>
              <Text style={styles.monthStepText}>+</Text>
            </Pressable>
          </View>
          <PrimaryButton title="기간 조건 적용" onPress={applyValue} inline />
        </BottomSheetPanel>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

export function YearRangeSheet({
  type,
  motion,
  range,
  setRange,
  onClose,
}: {
  type: 'opened' | 'modified';
  motion: Animated.Value;
  range: MonthRange;
  setRange: React.Dispatch<React.SetStateAction<MonthRange>>;
  onClose: () => void;
}) {
  const isOpened = type === 'opened';
  const fromParts = getMonthParts(range.from);
  const toParts = getMonthParts(range.to);
  const [fromYearText, setFromYearText] = useState(`${fromParts.year}`);
  const [fromMonthText, setFromMonthText] = useState(`${fromParts.month}`);
  const [toYearText, setToYearText] = useState(`${toParts.year}`);
  const [toMonthText, setToMonthText] = useState(`${toParts.month}`);

  useEffect(() => {
    const nextFrom = getMonthParts(range.from);
    const nextTo = getMonthParts(range.to);
    setFromYearText(`${nextFrom.year}`);
    setFromMonthText(`${nextFrom.month}`.padStart(2, '0'));
    setToYearText(`${nextTo.year}`);
    setToMonthText(`${nextTo.month}`.padStart(2, '0'));
  }, [range.from, range.to]);

  const onlyNumber = (value: string) => value.replace(/[^0-9]/g, '');
  const commitTypedRange = () => {
    const minParts = getMonthParts(minScanMonthIndex);
    const maxParts = getMonthParts(maxScanMonthIndex);
    const fromYear = Math.max(minParts.year, Math.min(maxParts.year, Number(fromYearText) || fromParts.year));
    const fromMonth = Math.max(1, Math.min(12, Number(fromMonthText) || fromParts.month));
    const toYear = Math.max(minParts.year, Math.min(maxParts.year, Number(toYearText) || toParts.year));
    const toMonth = Math.max(1, Math.min(12, Number(toMonthText) || toParts.month));
    const fromIndex = clampScanMonth(toMonthIndex(fromYear, fromMonth));
    const toIndex = clampScanMonth(toMonthIndex(toYear, toMonth));
    setRange({ from: Math.min(fromIndex, toIndex), to: Math.max(fromIndex, toIndex) });
  };

  return (
    <Animated.View style={[styles.sheetOverlay, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.keywordSheet} onClose={onClose}>
        <Text style={styles.modalTitle}>{isOpened ? '마지막으로 연 날짜' : '마지막 수정일'}</Text>
        <Text style={styles.infoDesc}>직접 입력하거나 아래 바를 월 단위로 드래그해서 설정하세요.</Text>
        <View style={styles.yearRangeSummary}>
          <Text style={styles.yearRangeLabel}>선택 범위</Text>
          <Text style={styles.yearRangeValue}>{formatMonthLabel(range.from)}부터</Text>
          <Text style={styles.yearRangeValue}>{formatMonthLabel(range.to)}까지</Text>
        </View>
        <View style={styles.periodInputPanel}>
          <Text style={styles.yearRangeLabel}>직접 입력</Text>
          <View style={styles.periodInputLine}>
            <Text style={styles.periodInputLabel}>시작</Text>
            <TextInput value={fromYearText} onChangeText={(value) => setFromYearText(onlyNumber(value).slice(0, 4))} onBlur={commitTypedRange} keyboardType="number-pad" style={styles.periodSmallInput} />
            <Text style={styles.periodUnit}>년</Text>
            <TextInput value={fromMonthText} onChangeText={(value) => setFromMonthText(onlyNumber(value).slice(0, 2))} onBlur={commitTypedRange} keyboardType="number-pad" style={styles.periodTinyInput} />
            <Text style={styles.periodUnit}>월</Text>
          </View>
          <View style={styles.periodInputLine}>
            <Text style={styles.periodInputLabel}>끝</Text>
            <TextInput value={toYearText} onChangeText={(value) => setToYearText(onlyNumber(value).slice(0, 4))} onBlur={commitTypedRange} keyboardType="number-pad" style={styles.periodSmallInput} />
            <Text style={styles.periodUnit}>년</Text>
            <TextInput value={toMonthText} onChangeText={(value) => setToMonthText(onlyNumber(value).slice(0, 2))} onBlur={commitTypedRange} keyboardType="number-pad" style={styles.periodTinyInput} />
            <Text style={styles.periodUnit}>월</Text>
          </View>
        </View>
        <YearRangeSlider range={range} setRange={setRange} />
        <PrimaryButton title="기간 조건 적용" onPress={() => { commitTypedRange(); onClose(); }} inline />
      </BottomSheetPanel>
    </Animated.View>
  );
}

function YearRangeSlider({ range, setRange }: { range: MonthRange; setRange: React.Dispatch<React.SetStateAction<MonthRange>> }) {
  const trackWidth = 226;
  const monthStep = trackWidth / (maxScanMonthIndex - minScanMonthIndex);
  const rangeRef = useRef(range);
  const startFrom = useRef(range.from);
  const startTo = useRef(range.to);
  const left = ((range.from - minScanMonthIndex) / (maxScanMonthIndex - minScanMonthIndex)) * trackWidth;
  const right = ((range.to - minScanMonthIndex) / (maxScanMonthIndex - minScanMonthIndex)) * trackWidth;

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  const fromResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startFrom.current = rangeRef.current.from;
    },
    onPanResponderMove: (_, gesture) => {
      const next = clampScanMonth(startFrom.current + Math.round(gesture.dx / monthStep));
      setRange((items) => {
        const updated = { ...items, from: Math.min(next, items.to) };
        rangeRef.current = updated;
        return updated;
      });
    },
  })).current;
  const toResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startTo.current = rangeRef.current.to;
    },
    onPanResponderMove: (_, gesture) => {
      const next = clampScanMonth(startTo.current + Math.round(gesture.dx / monthStep));
      setRange((items) => {
        const updated = { ...items, to: Math.max(next, items.from) };
        rangeRef.current = updated;
        return updated;
      });
    },
  })).current;

  return (
    <View style={styles.yearSliderWrap}>
      <View style={styles.yearSliderTrack}>
        <View style={[styles.yearSliderSelected, { left, width: Math.max(0, right - left) }]} />
        <View style={[styles.yearHandle, { left: left - 22 }]} {...fromResponder.panHandlers}>
          <Text style={styles.yearHandleText}>{formatMonthShortLabel(range.from)}</Text>
        </View>
        <View style={[styles.yearHandle, { left: right - 22 }]} {...toResponder.panHandlers}>
          <Text style={styles.yearHandleText}>{formatMonthShortLabel(range.to)}</Text>
        </View>
      </View>
      <View style={styles.yearTickRow}>
        {[toMonthIndex(2018, 1), toMonthIndex(2020, 1), toMonthIndex(2022, 1), toMonthIndex(2024, 1), toMonthIndex(2026, 7)].map((month) => (
          <Text key={month} style={styles.yearTickText}>{formatMonthShortLabel(month)}</Text>
        ))}
      </View>
      <Text style={styles.helperText}>바를 월 단위로 움직이면 조건 날짜가 바뀝니다.</Text>
    </View>
  );
}

export function FilterSortSheet({
  motion,
  date,
  size,
  sort,
  setDate,
  setSize,
  setSort,
  onClose,
}: {
  motion: Animated.Value;
  date: string;
  size: string;
  sort: string;
  setDate: (value: string) => void;
  setSize: (value: string) => void;
  setSort: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Animated.View style={[styles.sheetOverlay, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <BottomSheetPanel motion={motion} outputRange={[0, 420]} style={styles.filterSheet} onClose={onClose}>
        <Text style={styles.modalTitle}>필터 및 정렬</Text>
        <Text style={styles.infoDesc}>날짜와 용량 조건을 적용하고 목록 순서를 바꿀 수 있어요.</Text>
        <Text style={styles.filterSectionTitle}>날짜 필터</Text>
        <View style={styles.chipWrap}>
          {['전체 기간', '1년 이상', '3년 이상', '5년 이상'].map((item) => (
            <SheetChip key={item} label={item} selected={date === item} onPress={() => setDate(item)} />
          ))}
        </View>
        <Text style={styles.filterSectionTitle}>용량 필터</Text>
        <View style={styles.chipWrap}>
          {['전체 용량', '100MB 이상', '500MB 이상', '1GB 이상'].map((item) => (
            <SheetChip key={item} label={item} selected={size === item} onPress={() => setSize(item)} />
          ))}
        </View>
        <Text style={styles.filterSectionTitle}>정렬</Text>
        <View style={styles.chipWrap}>
          {['날짜순', '용량순', '발신자순', '이름순'].map((item) => (
            <SheetChip key={item} label={item} selected={sort === item} onPress={() => setSort(item)} />
          ))}
        </View>
        <PrimaryButton title="필터 적용하기" onPress={onClose} inline />
      </BottomSheetPanel>
    </Animated.View>
  );
}
