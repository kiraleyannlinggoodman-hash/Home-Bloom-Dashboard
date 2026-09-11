import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useListProgressGrades, useUpdateProgressGrade } from '@workspace/api-client-react';
import { Card, Screen, State, styles } from '@/components/native-ui';
import { useColors } from '@/hooks/useColors';
export default function Progress() {
  const q = useListProgressGrades(); const update = useUpdateProgressGrade(); const colors = useColors(); const rows = q.data ?? [];
  return <Screen title="Progress"><State loading={q.isLoading} error={q.error} empty={!q.isLoading && rows.length === 0} />
    {rows.map((item) => <Card key={item.id}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 17 }}>{item.subject}</Text><View style={styles.row}>{(['term1','term2','term3','term4'] as const).map((term) => <TextInput key={term} testID={`grade-${item.id}-${term}`} style={[styles.input, { borderColor: colors.input, color: colors.foreground, flex: 1 }]} placeholder={term.replace('term','T')} placeholderTextColor={colors.mutedForeground} keyboardType="numeric" defaultValue={item[term]?.toString() ?? ''} onEndEditing={(e) => update.mutate({ id: item.id, data: { [term]: Number(e.nativeEvent.text) || null } })} />)}</View></Card>)}</Screen>;
}