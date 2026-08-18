import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

export function StorageTrashNotice() {
  return (
    <View style={styles.storageTrashNoticeBlock}>
      <Text style={styles.storageTrashNoticeText}>휴지통에 있는 항목들은 30일 이후 자동으로 삭제됩니다.</Text>
    </View>
  );
}
