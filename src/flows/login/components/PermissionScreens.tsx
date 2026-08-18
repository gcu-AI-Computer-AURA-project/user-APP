import React from 'react';
import { Text, View } from 'react-native';

import type { AuraServicePermissions } from '../../../api/types';
import { OutlineButton, PrimaryButton } from '../../../components/AppButtons';
import { ScreenShell } from '../../../components/layout';
import { Card, SectionTitle } from '../../../components/ui';
import { styles } from '../../../styles/appStyles';

type PermissionScreen = 'gmailPermission' | 'drivePermission' | 'notificationPermission';
type GoogleServiceType = 'GMAIL' | 'DRIVE';

type PermissionInfo = {
  title: string;
  subtitle?: string;
  reasonTitle: string;
  reasonDescription: string;
  reasonSections: Array<{ title: string; items: string[] }>;
  reasonNote: string;
  guide: string;
  button: string;
  key: 'gmail' | 'drive' | 'alarm';
};

const permissionInfo: Record<PermissionScreen, PermissionInfo> = {
  gmailPermission: {
    title: 'Gmail 접근',
    reasonTitle: '권한을 요청하는 이유',
    reasonDescription: 'AURA는 불필요한 메일을 찾기 위해 메일의 기본 정보만 확인합니다.',
    reasonSections: [
      {
        title: 'AURA가 확인하는 정보',
        items: ['메일 제목, 보낸 사람, 받은 날짜', '첨부파일 여부와 첨부 용량', '선택한 메일을 휴지통으로 이동할 권한'],
      },
      {
        title: '확인하지 않는 정보',
        items: ['메일 본문 원문은 AI에게 전달하지 않음', '메일 발송, 답장, 전달 권한은 사용하지 않음', '최종 승인 전에는 어떤 메일도 이동하지 않음'],
      },
    ],
    reasonNote: '사용자가 최종 승인한 항목만 휴지통으로 이동합니다.',
    guide: '설정에서 언제든지 권한을 변경할 수 있어요.',
    button: 'Gmail 접근 허용',
    key: 'gmail',
  },
  drivePermission: {
    title: 'Google Drive 접근',
    reasonTitle: '권한을 요청하는 이유',
    reasonDescription: 'AURA는 오래된 파일과 중복 파일을 찾기 위해 파일의 기본 정보만 확인합니다.',
    reasonSections: [
      {
        title: 'AURA가 확인하는 정보',
        items: ['파일 이름, 확장자, 용량, 수정일', '선택한 Drive 폴더와 파일 경로', '중복 확인을 위한 파일 해시'],
      },
      {
        title: '확인하지 않는 정보',
        items: ['파일 원문 내용은 AI에게 전달하지 않음', '파일을 임의로 수정하거나 공유하지 않음', '최종 승인 전에는 어떤 파일도 이동하지 않음'],
      },
    ],
    reasonNote: '사용자가 최종 승인한 항목만 휴지통으로 이동합니다.',
    guide: '설정에서 언제든지 권한을 변경할 수 있어요.',
    button: 'Drive 접근 허용',
    key: 'drive',
  },
  notificationPermission: {
    title: '푸시 알림',
    reasonTitle: '권한을 요청하는 이유',
    reasonDescription: 'AURA는 사용자가 앱을 닫아도 정리 진행 상태를 놓치지 않도록 알림을 보냅니다.',
    reasonSections: [
      {
        title: 'AURA가 보내는 알림',
        items: ['백그라운드 스캔 완료 안내', '정리 후보가 준비되었을 때의 알림'],
      },
      {
        title: '알림에서 제외되는 내용',
        items: ['메일과 파일의 원문 내용은 알림에 담지 않음', '광고성 알림은 보내지 않음', '알림 설정은 언제든지 변경 가능'],
      },
    ],
    reasonNote: '',
    guide: '설정에서 언제든지 권한을 변경할 수 있어요.',
    button: '푸시 알림 허용',
    key: 'alarm',
  },
};

export function PushNotificationPermissionContent() {
  const info = permissionInfo.notificationPermission;

  return (
    <Card style={[styles.permissionReasonCard, styles.pushPermissionReasonCard]}>
      <SectionTitle>{info.reasonTitle}</SectionTitle>
      <Text style={styles.permissionReasonDescription}>{info.reasonDescription}</Text>
      {info.reasonSections.map((section) => (
        <View key={section.title} style={styles.permissionReasonSection}>
          <Text style={styles.permissionReasonTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <Text key={item} style={styles.permissionReasonText}>• {item}</Text>
          ))}
        </View>
      ))}
    </Card>
  );
}

export function PermissionDetail({
  screen,
  back,
  onServicePermissionChange,
  requestPushPermission,
  enableGoogleServicePermission,
  disableGoogleServicePermission,
}: {
  screen: PermissionScreen;
  back: () => void;
  onServicePermissionChange: (nextPermissions: Partial<AuraServicePermissions>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  enableGoogleServicePermission: (serviceType: GoogleServiceType) => Promise<boolean>;
  disableGoogleServicePermission: (serviceType: GoogleServiceType) => Promise<boolean>;
}) {
  const info = permissionInfo[screen];

  return (
    <ScreenShell title={info.title} subtitle={info.key === 'alarm' ? info.subtitle : undefined} noNav onBack={back}>
      {screen === 'notificationPermission' ? (
        <PushNotificationPermissionContent />
      ) : (
        <Card style={styles.permissionReasonCard}>
          <SectionTitle>{info.reasonTitle}</SectionTitle>
          <Text style={styles.permissionReasonDescription}>{info.reasonDescription}</Text>
          {info.reasonSections.map((section) => (
            <View key={section.title} style={styles.permissionReasonSection}>
              <Text style={styles.permissionReasonTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <Text key={item} style={styles.permissionReasonText}>• {item}</Text>
              ))}
            </View>
          ))}
          {info.reasonNote ? (
            <View style={styles.permissionReasonNote}>
              <Text style={styles.permissionReasonNoteText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                {info.reasonNote}
              </Text>
            </View>
          ) : null}
        </Card>
      )}
      <PrimaryButton
        title={info.button}
        onPress={() => {
          if (info.key === 'alarm') {
            void requestPushPermission().then((allowed) => {
              void onServicePermissionChange({ alarm: allowed });
              back();
            });
            return;
          }

          const serviceType = info.key === 'gmail' ? 'GMAIL' : 'DRIVE';
          void enableGoogleServicePermission(serviceType).then((enabled) => {
            if (enabled) back();
          });
        }}
      />
      {info.key !== 'alarm' ? (
        <OutlineButton
          title="지금은 허용하지 않기"
          onPress={() => {
            const serviceType = info.key === 'gmail' ? 'GMAIL' : 'DRIVE';
            void disableGoogleServicePermission(serviceType).then((disabled) => {
              if (disabled) back();
            });
          }}
        />
      ) : null}
      <Text style={styles.helperText}>{info.guide}</Text>
    </ScreenShell>
  );
}
