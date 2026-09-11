declare module 'expo-notifications' {
  export interface NotificationResponse { notification: { request: { identifier: string; content: { data: Record<string, unknown> } } } }
  export const SchedulableTriggerInputTypes: { DATE: 'date' };
  export function setNotificationHandler(handler: { handleNotification: () => Promise<Record<string, boolean>> }): void;
  export function addNotificationResponseReceivedListener(listener: (response: NotificationResponse) => void): { remove: () => void };
  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>;
  export function requestPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  export function scheduleNotificationAsync(input: { content: { title: string; body: string; data?: Record<string, unknown> }; trigger: unknown }): Promise<string>;
  export function cancelAllScheduledNotificationsAsync(): Promise<void>;
  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
}