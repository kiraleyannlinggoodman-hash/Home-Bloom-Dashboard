import React from 'react';
import { Text } from 'react-native';
import { useGetDashboardSummary, useGetDailyQuote } from '@workspace/api-client-react';
import { Card, Screen, State } from '@/components/native-ui';
import { useColors } from '@/hooks/useColors';

export default function Home() {
  const colors = useColors();
  const summary = useGetDashboardSummary();
  const quote = useGetDailyQuote();
  return <Screen title="Good morning">
    <State loading={summary.isLoading} error={summary.error} />
    {summary.data && <Card><Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>Welcome, {summary.data.greetingName}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>{summary.data.studyMinutesToday} minutes studied today · {summary.data.tasksDueToday} tasks due</Text>
      <Text style={{ color: colors.secondaryForeground, marginTop: 8 }}>Focus streak: {summary.data.focusStreakDays} days · {summary.data.bloomProgressLabel}</Text></Card>}
    {quote.data && <Card><Text style={{ color: colors.foreground, fontStyle: 'italic' }}>“{quote.data.text}”{quote.data.author ? ` — ${quote.data.author}` : ''}</Text></Card>}
  </Screen>;
}