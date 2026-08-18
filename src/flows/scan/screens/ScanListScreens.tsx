import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '../../../components/AppButtons';
import { CheckBox } from '../../../components/CheckBox';
import { ScreenShell } from '../../../components/layout';
import { EmptyState } from '../../../components/ui';
import { styles } from '../../../styles/appStyles';
import type { ScanListItem } from '../types';

export function ProtectedListScreen({ items, onOpenItem }: { items: ScanListItem[]; onOpenItem: (item: ScanListItem) => void }) {
  return (
    <ScreenShell title="보호된 항목">
      {items.length ? (
        items.map((item) => (
          <Pressable key={`${item.source}:${item.id}`} style={styles.listCard} onPress={() => onOpenItem(item)}>
            <View style={[styles.statusLight, styles.statusLightGreen]} />
            <View style={styles.infoMain}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoDesc}>{item.source === 'mail' ? 'Gmail' : 'Drive'} · 제외 키워드 보호</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyState title="보호된 항목이 없어요" desc="제외 키워드와 일치한 항목이 있으면 여기에 표시돼요." />
      )}
    </ScreenShell>
  );
}

export function ListScreen({
  title,
  prefix,
  items,
  checked,
  toggle,
  setAll,
  goNext,
  openFilter,
  notice,
  onOpenItem,
  isDefaultCandidateSelected,
  formatDataSize,
  sumScanItemSize,
}: {
  title: string;
  prefix: string;
  items: ScanListItem[];
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
  setAll: (prefix: string, keys: string[]) => void;
  goNext: () => void;
  openFilter: () => void;
  notice?: string;
  onOpenItem?: (item: ScanListItem) => void;
  isDefaultCandidateSelected: (prefix: string, id: string) => boolean;
  formatDataSize: (sizeMB: number) => string;
  sumScanItemSize: (items: ScanListItem[]) => number;
}) {
  const allChecked = items.every((item) => checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id));
  const selectedItems = items.filter((item) => checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id));
  const selectedCount = selectedItems.length;
  const selectedSizeLabel = formatDataSize(sumScanItemSize(selectedItems));
  const noticeParts = notice?.split('\n') ?? [];

  return (
    <ScreenShell title={title}>
      {notice ? (
        <Text style={styles.listNoticeText}>
          {noticeParts[0]}
          {noticeParts.slice(1).map((part) => (
            <Text key={part} style={styles.listNoticeDanger}>{'\n'}{part}</Text>
          ))}
        </Text>
      ) : null}
      <Pressable style={styles.selectAllRow} onPress={() => setAll(prefix, items.map((item) => item.id))}>
        <CheckBox checked={allChecked} onPress={() => setAll(prefix, items.map((item) => item.id))} />
        <Text style={styles.selectAllText}>{allChecked ? '전체 선택 해제' : '전체 선택'}</Text>
        <Pressable onPress={openFilter} hitSlop={8}>
          <Text style={styles.filterText}>필터</Text>
        </Pressable>
      </Pressable>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.listCard} onPress={() => (onOpenItem ? onOpenItem(item) : toggle(`${prefix}:${item.id}`))}>
          <CheckBox checked={checked[`${prefix}:${item.id}`] ?? isDefaultCandidateSelected(prefix, item.id)} onPress={() => toggle(`${prefix}:${item.id}`)} />
          <View style={styles.infoMain}>
            <Text style={styles.infoTitle}>{item.title}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Text style={styles.resultSummary}>선택 {selectedCount}개 · 예상 확보 {selectedSizeLabel}</Text>
      <PrimaryButton title="분석 화면 돌아가기" onPress={goNext} />
    </ScreenShell>
  );
}
