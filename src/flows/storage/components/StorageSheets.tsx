import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetPanel } from '../../../components/BottomSheetPanel';
import { CheckLine } from '../../../components/CheckLine';
import { OutlineButton, PrimaryButton } from '../../../components/AppButtons';
import { styles } from '../../../styles/appStyles';
import type { StorageDriveItem } from '../types';

const getDriveFolderName = (path: string) => path.split(/\s*(?:›|>|·|쨌)\s*/).at(-1) ?? path;

export function PermissionRevokedCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.permissionRevokedCard}>
      <View style={styles.permissionRevokedIcon}>
        <Text style={styles.permissionRevokedIconText}>G</Text>
      </View>
      <Text style={styles.permissionRevokedTitle}>메일 또는 드라이브 접근 권한을 설정해주세요</Text>
      <PrimaryButton title="권한 연결 화면으로 이동" onPress={onPress} inline />
    </View>
  );
}

export function StorageDeleteSheet({
  permanent,
  count,
  checked,
  motion,
  onToggle,
  onCancel,
  onConfirm,
}: {
  permanent: boolean;
  count: number;
  checked: boolean;
  motion: Animated.Value;
  onToggle: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.storageDeleteSheet} onClose={onCancel}>
        <Text style={styles.storageDeleteTitle}>{permanent ? '영구 삭제할까요?' : '휴지통으로 이동할까요?'}</Text>
        <View style={permanent ? styles.storageDeleteWarningBox : styles.storageDeleteInfoBox}>
          <Text style={styles.storageDeleteWarningTitle}>{permanent ? '이 작업은 되돌릴 수 없습니다' : '휴지통으로 이동합니다'}</Text>
          <Text style={styles.storageDeleteWarningText}>
            선택한 {count}개 항목을 {permanent ? '완전히 삭제합니다.' : '휴지통으로 이동합니다.'}
          </Text>
        </View>
        <CheckLine
          label={permanent ? '영구 삭제 내용을 확인했습니다' : '휴지통 이동 내용을 확인했습니다'}
          checked={checked}
          onPress={onToggle}
        />
        <View style={styles.twoButtons}>
          <OutlineButton title="취소" onPress={onCancel} half />
          <Pressable style={[styles.storageDeleteDangerButton, !checked && styles.dangerButtonDisabled, styles.halfButton]} onPress={onConfirm}>
            <Text style={styles.dangerText}>{permanent ? '영구 삭제' : '휴지통 이동'}</Text>
          </Pressable>
        </View>
      </BottomSheetPanel>
    </View>
  );
}

export function StorageRestoreSheet({
  count,
  checked,
  motion,
  onToggle,
  onCancel,
  onConfirm,
}: {
  count: number;
  checked: boolean;
  motion: Animated.Value;
  onToggle: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={motion} outputRange={[0, 360]} style={styles.storageDeleteSheet} onClose={onCancel}>
        <Text style={styles.storageDeleteTitle}>정리함으로 복구할까요?</Text>
        <View style={styles.storageRestoreInfoBox}>
          <Text style={styles.storageDeleteWarningTitle}>정리함으로 다시 이동합니다</Text>
          <Text style={styles.storageDeleteWarningText}>선택한 {count}개 항목을 정리함으로 복구합니다.</Text>
        </View>
        <CheckLine label="복구 내용을 확인했습니다" checked={checked} onPress={onToggle} />
        <View style={styles.twoButtons}>
          <OutlineButton title="취소" onPress={onCancel} half />
          <Pressable style={[styles.storageRestoreButton, !checked && styles.restoreButtonDisabled, styles.halfButton]} onPress={onConfirm}>
            <Text style={styles.restoreText}>복구하기</Text>
          </Pressable>
        </View>
      </BottomSheetPanel>
    </View>
  );
}

export function StorageMoveSheet({
  item,
  folders,
  onCancel,
  onMove,
}: {
  item: StorageDriveItem;
  folders: string[];
  onCancel: () => void;
  onMove: (folder: string) => void;
}) {
  const sheetMotion = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    sheetMotion.setValue(1);
    Animated.timing(sheetMotion, {
      toValue: 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [sheetMotion]);

  return (
    <View style={styles.storageDeleteOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BottomSheetPanel motion={sheetMotion} outputRange={[0, 420]} style={styles.storageMoveSheet} onClose={onCancel}>
        <View style={styles.infoMain}>
          <Text style={styles.storageDeleteTitle}>폴더 이동</Text>
          <Text style={styles.infoDesc}>{item.title}을 이동할 위치를 선택하세요</Text>
        </View>
        <View style={styles.storageMoveCurrentBox}>
          <Text style={styles.infoTitle}>{item.title}</Text>
          <Text style={styles.infoDesc}>{item.subtitle}</Text>
        </View>
        <View style={styles.storageMoveTargetList}>
          {folders.map((folder) => (
            <Pressable key={folder} style={styles.storageMoveTargetRow} onPress={() => onMove(folder)}>
              <View style={styles.folderTypeIcon}>
                <Text style={styles.folderTypeText}>F</Text>
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoTitle}>{getDriveFolderName(folder)}</Text>
                <Text style={styles.infoDesc}>{folder}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheetPanel>
    </View>
  );
}
