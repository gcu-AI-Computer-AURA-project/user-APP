import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../../../components/AppButtons';
import { ScreenShell } from '../../../components/layout';
import { Chip, SectionTitle } from '../../../components/ui';
import { styles } from '../../../styles/appStyles';
import { mutedText } from '../../../styles/theme';

export function KeywordEditor({
  type,
  keywords,
  input,
  setInput,
  addKeyword,
  removeKeyword,
  back,
}: {
  type: 'include' | 'exclude';
  keywords: string[];
  input: string;
  setInput: (text: string) => void;
  addKeyword: (type: 'include' | 'exclude') => void;
  removeKeyword: (type: 'include' | 'exclude', keyword: string) => void;
  back: () => void;
}) {
  const isInclude = type === 'include';

  return (
    <ScreenShell title={isInclude ? '포함 키워드 설정' : '제외 키워드 설정'}>
      <Text style={styles.meta}>
        {isInclude
          ? '해당 키워드가 있는 메일을 정리 후보에 포함합니다.'
          : '해당 키워드가 있는 항목은 정리 후보에서 제외합니다.'}
      </Text>
      <View style={styles.inputRow}>
        <TextInput value={input} onChangeText={setInput} placeholder="키워드 입력" placeholderTextColor={mutedText} style={styles.input} />
        <Pressable style={styles.addButton} onPress={() => addKeyword(type)}>
          <Text style={styles.addButtonText}>추가</Text>
        </Pressable>
      </View>
      <SectionTitle>현재 키워드</SectionTitle>
      <View style={styles.chipWrap}>
        {keywords.map((keyword) => (
          <Chip key={keyword} label={keyword} removable onRemove={() => removeKeyword(type, keyword)} />
        ))}
      </View>
      <PrimaryButton title={isInclude ? '포함 키워드 적용' : '제외 키워드 적용'} onPress={back} />
    </ScreenShell>
  );
}
