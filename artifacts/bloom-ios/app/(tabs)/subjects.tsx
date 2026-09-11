import React from 'react';
import { FlatList, Text } from 'react-native';
import { useListSubjects } from '@workspace/api-client-react';
import { Card, Screen, State } from '@/components/native-ui';
import { useColors } from '@/hooks/useColors';
export default function Subjects() {
  const q = useListSubjects(); const colors = useColors(); const rows = q.data ?? [];
  return <Screen title="Subjects"><State loading={q.isLoading} error={q.error} empty={!q.isLoading && rows.length === 0} />
    <FlatList data={rows} scrollEnabled={rows.length > 0} keyExtractor={(x) => String(x.id)} renderItem={({ item }) => <Card><Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{item.emoji} {item.name}</Text><Text style={{ color: colors.mutedForeground, marginTop: 8 }}>{item.masteryPercent}% mastery · {item.notesCount} notes</Text></Card>} /></Screen>;
}