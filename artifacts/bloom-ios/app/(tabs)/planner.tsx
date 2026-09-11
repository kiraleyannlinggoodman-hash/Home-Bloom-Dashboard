import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, Text, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListPlannerItems, useCreatePlannerItem, useUpdatePlannerItem, useDeletePlannerItem } from '@workspace/api-client-react';
import { Card, Button, Screen, State, styles } from '@/components/native-ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { REMINDER_OPTIONS, useNotificationPreferences, PlannerCategory } from '@/context/NotificationPreferences';
const today = new Date().toISOString().slice(0, 10);
const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + 30); const through = futureDate.toISOString().slice(0, 10);
const categories: PlannerCategory[] = ['homework', 'exam', 'event', 'study_block'];
const notificationStorageKey = 'bloom.planner-notification-ids';
type PlannerNotificationIds = Record<string, string>;

function parseNotificationIds(value: string | null): PlannerNotificationIds {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return Object.fromEntries(parsed.map((id, index) => [String(index), String(id)]));
    if (parsed && typeof parsed === 'object') return parsed as PlannerNotificationIds;
  } catch {
    // A malformed local cache should not prevent new reminders from being scheduled.
  }
  return {};
}

async function cancelPlannerNotification(itemId: number) {
  if (Platform.OS === 'web') return;
  const stored = parseNotificationIds(await AsyncStorage.getItem(notificationStorageKey));
  const notificationId = stored[String(itemId)];
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
  delete stored[String(itemId)];
  await AsyncStorage.setItem(notificationStorageKey, JSON.stringify(stored));
}

export default function Planner() {
  const colors = useColors(); const { preferences } = useNotificationPreferences();
  const q = useListPlannerItems({ from: today, to: through }); const create = useCreatePlannerItem(); const update = useUpdatePlannerItem(); const remove = useDeletePlannerItem();
  const [title, setTitle] = useState(''); const [type, setType] = useState<PlannerCategory>('homework'); const [date, setDate] = useState(today); const [time, setTime] = useState('09:00'); const [reminder, setReminder] = useState(preferences.defaultReminder);
  useEffect(() => { setReminder(preferences.defaultReminder); }, [preferences.defaultReminder]);
  useEffect(() => {
    if (!q.data || Platform.OS === 'web') return;
    let stale = false;
    const reconcile = async () => {
      const old = parseNotificationIds(await AsyncStorage.getItem(notificationStorageKey));
      await Promise.all(Object.values(old).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
      if (stale) return;

      const next: PlannerNotificationIds = {};
      for (const item of q.data) {
        const category = item.type as PlannerCategory;
        if (stale || item.completed || !item.startTime || !item.reminderMinutes || !preferences.enabled || !preferences.categories[category]) continue;
        const when = new Date(`${item.date}T${item.startTime}:00`);
        when.setMinutes(when.getMinutes() - item.reminderMinutes);
        if (when <= new Date()) continue;
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: { title: item.title, body: `Upcoming ${item.type}`, data: { managedBy: 'bloom-planner', route: '/planner', id: item.id } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
          if (stale) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
          else next[String(item.id)] = id;
        } catch {
          // Keep other planner reminders working if one item has invalid date data.
        }
      }
      if (!stale) await AsyncStorage.setItem(notificationStorageKey, JSON.stringify(next));
    };
    void reconcile();
    return () => { stale = true; };
  }, [q.data, preferences]);
  const add = () => { if (!title.trim()) return; create.mutate({ data: { title: title.trim(), type, date, startTime: time, reminderMinutes: reminder as 5 | 15 | 30 | 60 | 120 | 1440, priority: 'medium' } }, { onSuccess: () => { setTitle(''); q.refetch(); } }); };
  return <Screen title="Planner"><KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" bottomOffset={24}>
    <State loading={q.isLoading} error={q.error} empty={!q.isLoading && !q.data?.length} />
    <Card><TextInput testID="planner-title" value={title} onChangeText={setTitle} placeholder="What are you planning?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { borderColor: colors.input, color: colors.foreground }]} />
      <TextInput testID="planner-date" value={date} onChangeText={setDate} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { borderColor: colors.input, color: colors.foreground }]} />
      <TextInput testID="planner-time" value={time} onChangeText={setTime} placeholder="Time (HH:mm)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { borderColor: colors.input, color: colors.foreground }]} />
      <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Category</Text><Pressable style={styles.row}>{categories.map((x) => <Button key={x} testID={`planner-type-${x}`} onPress={() => setType(x)}>{type === x ? `✓ ${x}` : x}</Button>)}</Pressable>
      <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Early reminder (minutes)</Text><Pressable style={styles.row}>{REMINDER_OPTIONS.map((x) => <Button key={x} testID={`planner-reminder-${x}`} onPress={() => setReminder(x)}>{reminder === x ? `✓ ${x}` : String(x)}</Button>)}</Pressable>
      <Button testID="planner-add" onPress={add}>Add to planner</Button>
    </Card>
    {q.data?.map((item) => <Card key={item.id}><Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>{item.title}</Text><Text style={{ color: colors.mutedForeground, marginTop: 6 }}>{item.type} · {item.date} {item.startTime ?? ''} · reminder {item.reminderMinutes ?? 'off'} min</Text><Button testID={`planner-complete-${item.id}`} onPress={() => { void cancelPlannerNotification(item.id).finally(() => update.mutate({ id: item.id, data: { completed: !item.completed } }, { onSuccess: () => q.refetch() })); }}>{item.completed ? 'Mark incomplete' : 'Complete'}</Button><Button testID={`planner-delete-${item.id}`} onPress={() => Alert.alert('Delete item?', item.title, [{ text: 'Cancel' }, { text: 'Delete', onPress: () => { void cancelPlannerNotification(item.id).finally(() => remove.mutate({ id: item.id }, { onSuccess: () => q.refetch() })); } }])}>Delete</Button></Card>)}
  </KeyboardAwareScrollViewCompat></Screen>;
}