import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { storageApi, type ApiStorageDetail } from '../../../api/features';
import { ScreenShell } from '../../../components/layout';
import { DriveLinkCard, EmptyState, MailBodyCard } from '../../../components/ui';
import { styles } from '../../../styles/appStyles';
import type { StorageDetailItem } from '../types';

export function StorageDetailScreen({
  item,
  apiAccessToken,
  getErrorMessage,
  pickReadableText,
  buildGoogleDriveWebViewLink,
}: {
  item: StorageDetailItem | null;
  apiAccessToken: string | null;
  getErrorMessage: (error: unknown, fallback: string) => string;
  pickReadableText: (...values: Array<string | null | undefined>) => string | undefined;
  buildGoogleDriveWebViewLink: (externalItemId?: string | null) => string | undefined;
}) {
  const [apiDetail, setApiDetail] = useState<ApiStorageDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!item || !apiAccessToken || (!item.itemId && !item.externalItemId)) {
      setApiDetail(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError('');

    const request = item.itemId
      ? storageApi.getItemDetail(item.itemId, { accessToken: apiAccessToken })
      : storageApi.getLiveDetail(
          {
            item_source: item.itemSource ?? (item.source === 'drive' ? 'DRIVE' : 'GMAIL'),
            external_item_id: item.externalItemId!,
          },
          { accessToken: apiAccessToken }
        );

    void request
      .then((detail) => {
        if (active) setApiDetail(detail ?? null);
      })
      .catch((error) => {
        if (active) setDetailError(getErrorMessage(error, '저장소 상세 정보를 불러오지 못했어요'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiAccessToken, buildGoogleDriveWebViewLink, getErrorMessage, item?.externalItemId, item?.itemId, item?.itemSource, item?.source]);

  if (!item) {
    return (
      <ScreenShell title="상세 보기">
        <EmptyState title="상세 정보를 불러올 항목이 없어요" desc="정리함 목록에서 항목을 다시 선택해 주세요." />
      </ScreenShell>
    );
  }

  const mailBodyPreview = item.source === 'mail'
    ? pickReadableText(apiDetail?.body_text, apiDetail?.snippet, item.snippet)
    : undefined;
  const driveWebViewLink = item.source === 'drive'
    ? pickReadableText(apiDetail?.web_view_link, item.webViewLink, buildGoogleDriveWebViewLink(apiDetail?.external_item_id ?? item.externalItemId))
    : undefined;

  return (
    <ScreenShell title="상세 보기">
      <Text style={styles.detailMainTitle}>{item.title}</Text>
      {item.source === 'mail' ? (
        <MailBodyCard bodyText={mailBodyPreview} loading={detailLoading} />
      ) : (
        <DriveLinkCard webViewLink={driveWebViewLink} loading={detailLoading} />
      )}
      <View style={styles.detailInfoBox}>
        <Text style={styles.detailInfoTitle}>메타데이터</Text>
        <Text style={styles.detailInfoText}>{item.meta}</Text>
      </View>
    </ScreenShell>
  );
}
