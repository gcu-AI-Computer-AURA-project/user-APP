import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { CheckBox } from '../../../components/CheckBox';
import { styles } from '../../../styles/appStyles';
import { extractStorageSizeMB, getStorageSizeLabel, getTrashDriveFolderPath } from '../storageFormatters';
import type { StorageDriveItem, StorageMailItem } from '../types';
import { FileOutlineIcon, FolderOutlineIcon } from './StorageIcons';

export function StorageMailCard({
  prefix,
  item,
  checked,
  toggle,
  selectionMode,
  onOpen,
  onLongSelect,
  compact,
  trashMode,
}: {
  prefix: string;
  item: StorageMailItem;
  checked: boolean;
  toggle: (key: string) => void;
  selectionMode: boolean;
  onOpen: (item: StorageMailItem) => void;
  onLongSelect: (id: string) => void;
  compact?: boolean;
  trashMode?: 'mail' | 'drive';
}) {
  const key = `${prefix}:${item.id}`;
  const storageSizeMB = extractStorageSizeMB(item.meta);
  const rightSizeLabel = trashMode ? getStorageSizeLabel(item.meta) : '';
  const isLargeTrashDriveItem = trashMode === 'drive' && storageSizeMB >= 500;
  const compactTitle = trashMode === 'drive' ? item.title : item.subtitle;
  const compactDescription = trashMode === 'drive' ? getTrashDriveFolderPath(item.meta) : item.title;

  return (
    <Pressable
      style={[styles.storageItemCard, compact && styles.storageItemCardCompact]}
      onPress={() => {
        if (selectionMode) {
          toggle(key);
          return;
        }
        onOpen(item);
      }}
      onLongPress={() => onLongSelect(item.id)}
      delayLongPress={420}
    >
      {selectionMode ? <CheckBox checked={checked} onPress={() => toggle(key)} compact /> : null}
      <View style={styles.infoMain}>
        <View style={[styles.storageTitleRow, compact && styles.storageTitleRowCompact]}>
          <Text style={styles.infoTitle} numberOfLines={1}>{compact ? compactTitle : item.subtitle}</Text>
        </View>
        {compact ? <Text style={styles.storageCompactMeta} numberOfLines={1}>{compactDescription}</Text> : <Text style={styles.infoDesc}>{item.meta}</Text>}
      </View>
      {rightSizeLabel ? <Text style={[styles.storageRightSize, isLargeTrashDriveItem && styles.storageRightSizeDanger]}>{rightSizeLabel}</Text> : null}
      <Pressable
        style={styles.storageChevronButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onOpen(item);
        }}
      >
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Pressable>
  );
}

export function StorageDriveCard({
  prefix,
  item,
  checked,
  toggle,
  selectionMode,
  onOpen,
  onLongSelect,
  onSelect,
  compact,
  descriptionOverride,
  rightSizeLabel,
  rightSizeDanger,
}: {
  prefix: string;
  item: StorageDriveItem;
  checked: boolean;
  toggle: (key: string) => void;
  selectionMode: boolean;
  onOpen: () => void;
  onLongSelect: () => void;
  onSelect?: () => void;
  compact?: boolean;
  descriptionOverride?: string;
  rightSizeLabel?: string;
  rightSizeDanger?: boolean;
}) {
  const isFolder = item.type === 'F';
  const key = `${prefix}:${item.id}`;
  const handleSelect = () => {
    if (onSelect) {
      onSelect();
      return;
    }
    toggle(key);
  };

  return (
    <Pressable
      style={[styles.storageItemCard, compact && styles.storageItemCardCompact]}
      onPress={() => {
        if (selectionMode) {
          handleSelect();
          return;
        }
        onOpen();
      }}
      onLongPress={onLongSelect}
      delayLongPress={420}
    >
      {selectionMode ? <CheckBox checked={checked} onPress={handleSelect} compact /> : null}
      <View style={styles.storageDriveItemPressArea}>
        {isFolder ? <FolderOutlineIcon /> : <FileOutlineIcon type={item.type} />}
        <View style={styles.infoMain}>
          <Text style={styles.infoTitle}>{item.title}</Text>
          {descriptionOverride ? (
            <Text style={styles.storageCompactMeta} numberOfLines={1}>{descriptionOverride}</Text>
          ) : compact ? (
            <Text style={styles.storageCompactMeta} numberOfLines={2}>{item.subtitle}</Text>
          ) : (
            <Text style={styles.infoDesc}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      {rightSizeLabel ? <Text style={[styles.storageRightSize, rightSizeDanger && styles.storageRightSizeDanger]}>{rightSizeLabel}</Text> : null}
      <Pressable
        style={styles.storageChevronButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onOpen();
        }}
      >
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Pressable>
  );
}
