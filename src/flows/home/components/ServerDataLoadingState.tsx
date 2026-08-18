import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';
import { navy } from '../../../styles/theme';

export function ServerDataLoadingState() {
  return (
    <View style={styles.serverDataLoadingState}>
      <ActivityIndicator size="large" color={navy} />
      <Text style={styles.serverDataLoadingText}>서버 데이터를 불러오는 중이에요</Text>
    </View>
  );
}
