import React from 'react';
import { Linking, Platform, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Button, Card, Screen } from '@/components/native-ui';
import { REMINDER_OPTIONS, PlannerCategory, useNotificationPreferences } from '@/context/NotificationPreferences';
import { useColors } from '@/hooks/useColors';
export default function Settings() {
  const colors = useColors(); const { preferences, setEnabled, setCategory, setDefaultReminder } = useNotificationPreferences();
  const enable = async (value: boolean) => {
    const ok = await setEnabled(value);
    if (!ok && value && Platform.OS !== 'web') {
      await Linking.openSettings().catch(() => undefined);
    }
  };
  return <Screen title="Settings"><Card><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 17 }}>Notifications</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}><Text style={{ color: colors.foreground }}>Enable reminders</Text><Switch testID="notifications-toggle" value={preferences.enabled} onValueChange={enable} trackColor={{ true: colors.primary }} /></View>
    {(['homework', 'exam', 'event', 'study_block'] as PlannerCategory[]).map((category) => <View key={category} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}><Text style={{ color: colors.foreground }}>{category.replace('_', ' ')}</Text><Switch testID={`notifications-${category}`} value={preferences.categories[category]} onValueChange={(value) => setCategory(category, value)} trackColor={{ true: colors.primary }} /></View>)}
  </Card><Card><Text style={{ color: colors.foreground, fontWeight: '700' }}>Default early reminder</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{REMINDER_OPTIONS.map((minutes) => <Button key={minutes} testID={`default-reminder-${minutes}`} onPress={() => setDefaultReminder(minutes)}>{preferences.defaultReminder === minutes ? `✓ ${minutes}` : String(minutes)}</Button>)}</View></Card><Button testID="request-notifications" onPress={() => enable(true)}>Request notification permission</Button></Screen>;
}