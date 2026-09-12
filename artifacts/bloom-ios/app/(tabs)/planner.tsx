import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreatePlannerItem, useDeletePlannerItem, useListPlannerItems, useUpdatePlannerItem, type PlannerItem, type PlannerItemType } from '@workspace/api-client-react';
import { Card, Button, Screen, State, styles } from '@/components/native-ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { REMINDER_OPTIONS, useNotificationPreferences } from '@/context/NotificationPreferences';

type PlannerView = 'today' | 'week' | 'month';

const VIEW_OPTIONS: Array<{ key: PlannerView; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];
const TYPE_OPTIONS: Array<{ key: PlannerItemType | 'all'; label: string; emoji: string }> = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'homework', label: 'Homework', emoji: '✅' },
  { key: 'exam', label: 'Exams', emoji: '🚨' },
  { key: 'study_block', label: 'Study', emoji: '📚' },
  { key: 'event', label: 'Events', emoji: '📅' },
  { key: 'note', label: 'Notes', emoji: '📝' },
];
const CREATE_TYPES: Array<{ key: PlannerItemType; label: string; emoji: string }> = TYPE_OPTIONS.filter((item): item is { key: PlannerItemType; label: string; emoji: string } => item.key !== 'all');
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonthGrid(date: Date) {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonthGrid(date: Date) {
  return addDays(startOfWeek(new Date(date.getFullYear(), date.getMonth() + 1, 0)), 6);
}

function dateLabel(date: Date, view: PlannerView) {
  if (view === 'today') return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  if (view === 'week') {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function typeEmoji(type: PlannerItemType) {
  return TYPE_OPTIONS.find((item) => item.key === type)?.emoji ?? '📌';
}

function typeLabel(type: PlannerItemType) {
  return TYPE_OPTIONS.find((item) => item.key === type)?.label ?? type;
}

function typePalette(type: PlannerItemType, colors: ReturnType<typeof useColors>) {
  if (type === 'homework') return { backgroundColor: colors.accent, color: colors.accentForeground };
  if (type === 'exam') return { backgroundColor: colors.secondary, color: colors.secondaryForeground };
  if (type === 'study_block') return { backgroundColor: colors.muted, color: colors.foreground };
  if (type === 'event') return { backgroundColor: colors.secondary, color: colors.foreground };
  return { backgroundColor: colors.muted, color: colors.mutedForeground };
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

function MiniSummary({ emoji, label, count, color, textColor }: { emoji: string; label: string; count: number; color: string; textColor: string }) {
  return (
    <View style={[plannerStyles.summary, { backgroundColor: color }]}>
      <Text style={plannerStyles.summaryEmoji}>{emoji}</Text>
      <Text style={[plannerStyles.summaryCount, { color: textColor }]}>{count}</Text>
      <Text style={[plannerStyles.summaryLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function PlannerItemRow({ item, showDate, onToggle, onDelete }: { item: PlannerItem; showDate: boolean; onToggle: () => void; onDelete: () => void }) {
  const colors = useColors();
  const palette = typePalette(item.type, colors);
  return (
    <View style={[plannerStyles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }, item.completed && plannerStyles.completedItem]}>
      <View style={[plannerStyles.itemIcon, { backgroundColor: palette.backgroundColor }]}>
        <Text style={plannerStyles.itemEmoji}>{typeEmoji(item.type)}</Text>
      </View>
      <View style={plannerStyles.itemDetails}>
        <Text style={[plannerStyles.itemTitle, { color: colors.foreground }, item.completed && plannerStyles.completedText]} numberOfLines={1}>{item.title}</Text>
        <Text style={[plannerStyles.itemMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {showDate ? `${item.date} · ` : ''}{item.startTime ?? 'Any time'}{item.endTime ? ` – ${item.endTime}` : ''} · {typeLabel(item.type)}
        </Text>
        {item.subject ? <Text style={[plannerStyles.itemSubject, { color: palette.color }]} numberOfLines={1}>{item.subject}</Text> : null}
      </View>
      <View style={plannerStyles.itemActions}>
        <Pressable testID={`planner-complete-${item.id}`} accessibilityLabel={item.completed ? 'Mark incomplete' : 'Complete item'} onPress={onToggle} style={[plannerStyles.circleAction, { borderColor: colors.border }]}>
          <Text style={{ color: item.completed ? colors.accentForeground : colors.mutedForeground }}>{item.completed ? '✓' : '○'}</Text>
        </Pressable>
        <Pressable testID={`planner-delete-${item.id}`} accessibilityLabel="Delete item" onPress={onDelete} style={[plannerStyles.circleAction, { borderColor: colors.border }]}>
          <Text style={{ color: colors.destructive }}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CalendarWeek({ date, items, onSelectDay }: { date: Date; items: PlannerItem[]; onSelectDay: (date: Date) => void }) {
  const colors = useColors();
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
  return (
    <View style={[plannerStyles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={plannerStyles.weekdayRow}>{WEEKDAY_LABELS.map((label, index) => <Text key={`${label}-${index}`} style={[plannerStyles.weekday, { color: colors.mutedForeground }]}>{label}</Text>)}</View>
      <View style={plannerStyles.weekGrid}>
        {days.map((day) => {
          const key = dateKey(day);
          const dayItems = items.filter((item) => item.date === key);
          const isSelected = key === dateKey(date);
          const isToday = key === dateKey(new Date());
          return (
            <Pressable key={key} testID={`planner-day-${key}`} onPress={() => onSelectDay(day)} style={[plannerStyles.weekDay, isSelected && { backgroundColor: colors.secondary }]}>
              <Text style={[plannerStyles.dayNumber, { color: isToday ? colors.secondaryForeground : colors.foreground }, isToday && { backgroundColor: colors.primary, color: colors.primaryForeground }]}>{day.getDate()}</Text>
              <View style={plannerStyles.dayDots}>
                {dayItems.slice(0, 3).map((item) => <View key={item.id} style={[plannerStyles.dayDot, { backgroundColor: typePalette(item.type, colors).color }]} />)}
              </View>
              <Text style={[plannerStyles.dayCount, { color: colors.mutedForeground }]}>{dayItems.length ? `${dayItems.length}` : '·'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalendarMonth({ date, items, onSelectDay }: { date: Date; items: PlannerItem[]; onSelectDay: (date: Date) => void }) {
  const colors = useColors();
  const start = startOfMonthGrid(date);
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
  return (
    <View style={[plannerStyles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={plannerStyles.weekdayRow}>{WEEKDAY_LABELS.map((label, index) => <Text key={`${label}-${index}`} style={[plannerStyles.weekday, { color: colors.mutedForeground }]}>{label}</Text>)}</View>
      <View style={plannerStyles.monthGrid}>
        {days.map((day) => {
          const key = dateKey(day);
          const dayItems = items.filter((item) => item.date === key);
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const isToday = key === dateKey(new Date());
          return (
            <Pressable key={key} testID={`planner-month-day-${key}`} onPress={() => onSelectDay(day)} style={plannerStyles.monthDay}>
              <Text style={[plannerStyles.monthNumber, { color: isCurrentMonth ? colors.foreground : colors.mutedForeground }, isToday && { color: colors.primary, fontFamily: 'Poppins_700Bold' }]}>{day.getDate()}</Text>
              <View style={plannerStyles.dayDots}>
                {dayItems.slice(0, 3).map((item) => <View key={item.id} style={[plannerStyles.dayDot, { backgroundColor: typePalette(item.type, colors).color }]} />)}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Planner() {
  const colors = useColors();
  const { preferences } = useNotificationPreferences();
  const [view, setView] = useState<PlannerView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<PlannerItemType | 'all'>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlannerItemType>('homework');
  const [date, setDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState('09:00');
  const [reminder, setReminder] = useState(preferences.defaultReminder);

  useEffect(() => { setReminder(preferences.defaultReminder); }, [preferences.defaultReminder]);

  const range = useMemo(() => {
    if (view === 'today') return { from: dateKey(currentDate), to: dateKey(currentDate) };
    if (view === 'week') return { from: dateKey(startOfWeek(currentDate)), to: dateKey(endOfWeek(currentDate)) };
    return { from: dateKey(startOfMonthGrid(currentDate)), to: dateKey(endOfMonthGrid(currentDate)) };
  }, [currentDate, view]);
  const q = useListPlannerItems(range);
  const create = useCreatePlannerItem();
  const update = useUpdatePlannerItem();
  const remove = useDeletePlannerItem();
  const items = q.data ?? [];
  const visibleItems = useMemo(() => {
    const next = filter === 'all' ? items : items.filter((item) => item.type === filter);
    return [...next].sort((a, b) => `${a.date}${a.startTime ?? ''}`.localeCompare(`${b.date}${b.startTime ?? ''}`));
  }, [filter, items]);
  const counts = useMemo(() => ({
    homework: items.filter((item) => item.type === 'homework').length,
    exam: items.filter((item) => item.type === 'exam').length,
    study: items.filter((item) => item.type === 'study_block').length,
    event: items.filter((item) => item.type === 'event').length,
  }), [items]);

  useEffect(() => {
    if (!q.data || Platform.OS === 'web') return;
    let stale = false;
    const reconcile = async () => {
      const old = parseNotificationIds(await AsyncStorage.getItem(notificationStorageKey));
      await Promise.all(Object.values(old).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
      if (stale) return;
      const next: PlannerNotificationIds = {};
      for (const item of q.data) {
        const category = item.type;
        if (stale || item.completed || category === 'note' || !item.startTime || !item.reminderMinutes || !preferences.enabled || !preferences.categories[category]) continue;
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
  }, [preferences, q.data]);

  const shiftDate = (amount: number) => setCurrentDate((value) => addDays(value, amount));
  const shiftAmount = view === 'today' ? 1 : view === 'week' ? 7 : 30;
  const selectDay = (day: Date) => { setCurrentDate(day); setView('today'); };
  const add = () => {
    if (!title.trim()) return;
    create.mutate({
      data: {
        title: title.trim(),
        type,
        date,
        startTime: time,
        reminderMinutes: type === 'note' ? undefined : reminder as 5 | 15 | 30 | 60 | 120 | 1440,
        priority: 'medium',
      },
    }, { onSuccess: () => { setTitle(''); setComposerOpen(false); q.refetch(); } });
  };
  const toggleItem = (item: PlannerItem) => {
    void cancelPlannerNotification(item.id).finally(() => update.mutate({ id: item.id, data: { completed: !item.completed } }, { onSuccess: () => q.refetch() }));
  };
  const deleteItem = (item: PlannerItem) => {
    Alert.alert('Delete item?', item.title, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void cancelPlannerNotification(item.id).finally(() => remove.mutate({ id: item.id }, { onSuccess: () => q.refetch() })); } }]);
  };

  return (
    <Screen title="Planner">
      <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" bottomOffset={24} contentContainerStyle={plannerStyles.scrollContent}>
        <View style={plannerStyles.introRow}>
          <View><Text style={[plannerStyles.eyebrow, { color: colors.secondaryForeground }]}>Your gentle plan</Text><Text style={[plannerStyles.subtitle, { color: colors.mutedForeground }]}>Organize your days, beautifully.</Text></View>
          <Pressable testID="planner-add-toggle" onPress={() => setComposerOpen((value) => !value)} style={[plannerStyles.addCircle, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontSize: 26, lineHeight: 28 }}>+</Text></Pressable>
        </View>

        <View style={[plannerStyles.segmented, { backgroundColor: colors.muted }]}>
          {VIEW_OPTIONS.map((option) => <Pressable key={option.key} testID={`planner-view-${option.key}`} onPress={() => setView(option.key)} style={[plannerStyles.segment, view === option.key && { backgroundColor: colors.card }]}><Text style={[plannerStyles.segmentText, { color: view === option.key ? colors.secondaryForeground : colors.mutedForeground }]}>{option.label}</Text></Pressable>)}
        </View>
        <View style={[plannerStyles.dateBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable testID="planner-previous" onPress={() => shiftDate(-shiftAmount)} style={plannerStyles.navButton}><Text style={{ color: colors.foreground, fontSize: 20 }}>‹</Text></Pressable>
          <Pressable testID="planner-today" onPress={() => setCurrentDate(new Date())}><Text style={[plannerStyles.dateLabel, { color: colors.foreground }]}>{dateLabel(currentDate, view)}</Text><Text style={[plannerStyles.todayHint, { color: colors.secondaryForeground }]}>Tap Today to reset</Text></Pressable>
          <Pressable testID="planner-next" onPress={() => shiftDate(shiftAmount)} style={plannerStyles.navButton}><Text style={{ color: colors.foreground, fontSize: 20 }}>›</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={plannerStyles.summaryScroll}>
          <MiniSummary emoji="✅" label="Homework" count={counts.homework} color={colors.accent} textColor={colors.accentForeground} />
          <MiniSummary emoji="🚨" label="Exams" count={counts.exam} color={colors.secondary} textColor={colors.secondaryForeground} />
          <MiniSummary emoji="📚" label="Study" count={counts.study} color={colors.muted} textColor={colors.foreground} />
          <MiniSummary emoji="📅" label="Events" count={counts.event} color={colors.secondary} textColor={colors.secondaryForeground} />
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={plannerStyles.filterScroll}>
          {TYPE_OPTIONS.map((option) => <Pressable key={option.key} testID={`planner-filter-${option.key}`} onPress={() => setFilter(option.key)} style={[plannerStyles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, filter === option.key && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}><Text style={plannerStyles.filterEmoji}>{option.emoji}</Text><Text style={[plannerStyles.filterText, { color: filter === option.key ? colors.secondaryForeground : colors.mutedForeground }]}>{option.label}</Text></Pressable>)}
        </ScrollView>

        {composerOpen && <Card><Text style={[plannerStyles.cardTitle, { color: colors.foreground }]}>Add to planner</Text><TextInput testID="planner-title" value={title} onChangeText={setTitle} placeholder="What are you planning?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { borderColor: colors.input, color: colors.foreground }]} /><View style={plannerStyles.inputRow}><TextInput testID="planner-date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.input, plannerStyles.halfInput, { borderColor: colors.input, color: colors.foreground }]} /><TextInput testID="planner-time" value={time} onChangeText={setTime} placeholder="HH:mm" placeholderTextColor={colors.mutedForeground} style={[styles.input, plannerStyles.halfInput, { borderColor: colors.input, color: colors.foreground }]} /></View><Text style={[plannerStyles.formLabel, { color: colors.mutedForeground }]}>Type</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={plannerStyles.chipRow}>{CREATE_TYPES.map((option) => <Pressable key={option.key} testID={`planner-type-${option.key}`} onPress={() => setType(option.key)} style={[plannerStyles.formChip, { borderColor: colors.border }, type === option.key && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}><Text>{option.emoji}</Text><Text style={{ color: type === option.key ? colors.secondaryForeground : colors.mutedForeground }}>{option.label}</Text></Pressable>)}</View></ScrollView>{type !== 'note' && <><Text style={[plannerStyles.formLabel, { color: colors.mutedForeground }]}>Early reminder</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={plannerStyles.chipRow}>{REMINDER_OPTIONS.map((option) => <Pressable key={option} testID={`planner-reminder-${option}`} onPress={() => setReminder(option)} style={[plannerStyles.formChip, { borderColor: colors.border }, reminder === option && { backgroundColor: colors.secondary, borderColor: colors.secondary }]}><Text style={{ color: reminder === option ? colors.secondaryForeground : colors.mutedForeground }}>{option >= 1440 ? '1 day' : option >= 60 ? `${option / 60}h` : `${option}m`}</Text></Pressable>)}</View></ScrollView></>}<Button testID="planner-add" onPress={add}>Add to planner</Button></Card>}

        <State loading={q.isLoading} error={q.error} />
        {!q.isLoading && view === 'week' && <CalendarWeek date={currentDate} items={items} onSelectDay={selectDay} />}
        {!q.isLoading && view === 'month' && <CalendarMonth date={currentDate} items={items} onSelectDay={selectDay} />}
        {!q.isLoading && view === 'today' && <View style={[plannerStyles.timeline, { borderLeftColor: colors.secondary }]}><Text style={[plannerStyles.sectionTitle, { color: colors.foreground }]}>{visibleItems.length ? 'Today at a glance' : 'A beautifully empty day'}</Text></View>}
        {!q.isLoading && visibleItems.length === 0 && <Card><Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>Nothing scheduled here yet. Take a breath, or add something new. 🍃</Text></Card>}
        {!q.isLoading && visibleItems.length > 0 && <View><View style={plannerStyles.listHeading}><Text style={[plannerStyles.sectionTitle, { color: colors.foreground }]}>{view === 'today' ? 'Your schedule' : 'All items in view'}</Text><Text style={[plannerStyles.listCount, { color: colors.mutedForeground }]}>{visibleItems.length} item{visibleItems.length === 1 ? '' : 's'}</Text></View>{visibleItems.map((item) => <PlannerItemRow key={item.id} item={item} showDate={view !== 'today'} onToggle={() => toggleItem(item)} onDelete={() => deleteItem(item)} />)}</View>}
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const plannerStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 4 },
  addCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 12 },
  segment: { flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 9 },
  segmentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  dateBar: { minHeight: 68, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },
  navButton: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  dateLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, textAlign: 'center' },
  todayHint: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 2, textAlign: 'center' },
  summaryScroll: { gap: 8, paddingBottom: 14 },
  summary: { width: 88, minHeight: 90, borderRadius: 18, padding: 10, justifyContent: 'space-between' },
  summaryEmoji: { fontSize: 18 },
  summaryCount: { fontFamily: 'Poppins_700Bold', fontSize: 23 },
  summaryLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  filterScroll: { gap: 8, paddingBottom: 14 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  filterEmoji: { fontSize: 13 },
  filterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17, marginBottom: 4 },
  inputRow: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  formLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginTop: 6, marginBottom: 2 },
  chipRow: { flexDirection: 'row', gap: 7, paddingVertical: 4 },
  formChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  calendarCard: { borderRadius: 20, borderWidth: 1, padding: 10, marginBottom: 14 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: 'Poppins_700Bold', fontSize: 10 },
  weekGrid: { flexDirection: 'row' },
  weekDay: { flex: 1, minHeight: 92, alignItems: 'center', borderRadius: 13, paddingTop: 5 },
  dayNumber: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', paddingTop: 5, fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  dayDots: { flexDirection: 'row', gap: 3, minHeight: 8, marginTop: 6 },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  dayCount: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginTop: 7 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDay: { width: `${100 / 7}%`, height: 54, alignItems: 'center', paddingTop: 4 },
  monthNumber: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  timeline: { borderLeftWidth: 2, marginLeft: 8, paddingLeft: 14, marginBottom: 8 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
  listHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9, marginTop: 2 },
  listCount: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  itemRow: { minHeight: 76, borderRadius: 18, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  completedItem: { opacity: 0.58 },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  itemEmoji: { fontSize: 19 },
  itemDetails: { flex: 1, minWidth: 0 },
  itemTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  itemMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 3 },
  itemSubject: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginTop: 4 },
  itemActions: { flexDirection: 'row', gap: 5, marginLeft: 6 },
  circleAction: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  completedText: { textDecorationLine: 'line-through' },
});