import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PlannerCategory = 'homework' | 'exam' | 'event' | 'study_block';
export const REMINDER_OPTIONS = [5, 15, 30, 60, 120, 1440] as const;
type Preferences = { enabled: boolean; categories: Record<PlannerCategory, boolean>; defaultReminder: number };
const defaults: Preferences = { enabled: false, categories: { homework: true, exam: true, event: true, study_block: true }, defaultReminder: 15 };
const key = 'bloom.notification-preferences';
const NotificationPreferencesContext = createContext<{ preferences: Preferences; setEnabled: (value: boolean) => Promise<boolean>; setCategory: (category: PlannerCategory, value: boolean) => Promise<void>; setDefaultReminder: (value: number) => Promise<void> } | null>(null);

export function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  useEffect(() => { AsyncStorage.getItem(key).then((value) => { if (value) try { setPreferences({ ...defaults, ...JSON.parse(value), categories: { ...defaults.categories, ...JSON.parse(value).categories } }); } catch { /* retain defaults */ } }); }, []);
  const save = async (next: Preferences) => { setPreferences(next); await AsyncStorage.setItem(key, JSON.stringify(next)); };
  const setEnabled = async (value: boolean) => {
    if (value && Platform.OS !== 'web' && !(await Notifications.requestPermissionsAsync()).granted) return false;
    await save({ ...preferences, enabled: value }); return true;
  };
  const value = useMemo(() => ({ preferences, setEnabled, setCategory: (category: PlannerCategory, enabled: boolean) => save({ ...preferences, categories: { ...preferences.categories, [category]: enabled } }), setDefaultReminder: (defaultReminder: number) => save({ ...preferences, defaultReminder }) }), [preferences]);
  return <NotificationPreferencesContext.Provider value={value}>{children}</NotificationPreferencesContext.Provider>;
}
export function useNotificationPreferences() {
  const value = useContext(NotificationPreferencesContext);
  if (!value) throw new Error('NotificationPreferencesProvider is missing');
  return value;
}