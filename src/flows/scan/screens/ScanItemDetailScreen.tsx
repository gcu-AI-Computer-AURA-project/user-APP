import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { candidateApi, type ApiCandidateDetail } from '../../../api/features';
import { ScreenShell } from '../../../components/layout';
import { Card, DriveLinkCard, MailBodyCard } from '../../../components/ui';
import { styles } from '../../../styles/appStyles';
import type { ScanListItem } from '../types';

export function ScanItemDetailScreen({
  title,
  subtitle,
  item,
  kind,
  apiAccessToken,
  getErrorMessage,
  pickReadableText,
  buildGoogleDriveWebViewLink,
  formatDataSize,
}: {
  title: string;
  subtitle?: string;
  item?: ScanListItem;
  kind: 'mail' | 'drive';
  apiAccessToken: string | null;
  getErrorMessage: (error: unknown, fallback: string) => string;
  pickReadableText: (...values: Array<string | null | undefined>) => string | undefined;
  buildGoogleDriveWebViewLink: (externalItemId?: string | null) => string | undefined;
  formatDataSize: (sizeMB: number) => string;
}) {
  const [apiDetail, setApiDetail] = useState<ApiCandidateDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!apiAccessToken || !item?.candidateId) {
      setApiDetail(null);
      setDetailError('');
      return;
    }

    let active = true;
    setDetailError('');
    void candidateApi
      .getDetail(item.candidateId, { accessToken: apiAccessToken })
      .then((detail) => {
        if (active) setApiDetail(detail ?? null);
      })
      .catch((error) => {
        if (active) setDetailError(getErrorMessage(error, '상세 정보를 불러오지 못했어요'));
      });

    return () => {
      active = false;
    };
  }, [apiAccessToken, getErrorMessage, item?.candidateId]);

  if (!item) {
    return (
      <ScreenShell title={title} subtitle={subtitle}>
        <Card tint>
          <Text style={styles.cardTitle}>상세 정보를 불러올 항목이 없어요</Text>
          <Text style={styles.meta}>분석 결과 목록에서 항목을 다시 선택해 주세요.</Text>
        </Card>
      </ScreenShell>
    );
  }

  const mailBodyPreview = kind === 'mail'
    ? pickReadableText(apiDetail?.item?.body_text, apiDetail?.item?.snippet, item.bodyPreview)
    : undefined;
  const driveWebViewLink = kind === 'drive'
    ? pickReadableText(apiDetail?.item?.web_view_link, item.webViewLink, buildGoogleDriveWebViewLink(apiDetail?.item?.external_item_id))
    : undefined;
  const detailSubtitle = kind === 'mail' && item.detailSubtitle === mailBodyPreview ? undefined : item.detailSubtitle;

  return (
    <ScreenShell title={title} subtitle={subtitle}>
      <Text style={styles.detailMainTitle}>{item.title}</Text>
      {detailSubtitle ? <Text style={styles.detailSubMeta}>{detailSubtitle}</Text> : null}
      {kind === 'mail' ? (
        <MailBodyCard bodyText={mailBodyPreview} loading={Boolean(apiAccessToken && item.candidateId && !apiDetail && !detailError)} />
      ) : (
        <DriveLinkCard webViewLink={driveWebViewLink} loading={Boolean(apiAccessToken && item.candidateId && !apiDetail && !detailError)} />
      )}
      {kind === 'mail' ? (
        <View style={styles.detailInfoBox}>
          <Text style={styles.detailInfoTitle}>선정 이유</Text>
          <Text style={styles.detailInfoText}>{item.desc}</Text>
          <View style={styles.thinDivider} />
          <Text style={styles.detailInfoTitle}>분석 메타데이터</Text>
          <Text style={styles.detailInfoText}>용량 {formatDataSize(item.sizeMB)} · 기준 날짜 {item.dateLabel}</Text>
        </View>
      ) : (
        <View style={styles.detailInfoBox}>
          <Text style={styles.detailInfoTitle}>파일 메타데이터</Text>
          <Text style={styles.detailInfoText}>용량 {formatDataSize(item.sizeMB)} · 기준 날짜 {item.dateLabel}</Text>
          {apiDetail?.item?.folder_path ? <Text style={styles.detailInfoText}>Drive 경로 {apiDetail.item.folder_path}</Text> : null}
        </View>
      )}
    </ScreenShell>
  );
}
