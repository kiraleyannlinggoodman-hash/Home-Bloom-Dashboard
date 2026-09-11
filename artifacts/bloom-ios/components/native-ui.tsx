import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

export function Screen({ children, title }: { children: React.ReactNode; title: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
    <View style={styles.content}><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>{children}</View>
  </View>;
}

export function Card({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

export function Button({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID: string }) {
  const colors = useColors();
  return <Pressable testID={testID} onPress={() => { Haptics.selectionAsync(); onPress(); }} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={styles.buttonText}>{children}</Text></Pressable>;
}

export function State({ loading, error, empty }: { loading?: boolean; error?: unknown; empty?: boolean }) {
  const colors = useColors();
  if (loading) return <ActivityIndicator color={colors.primary} style={{ margin: 32 }} />;
  if (error) return <Text style={{ color: colors.destructive, marginVertical: 16 }}>Unable to load your Bloom data. Pull to try again.</Text>;
  if (empty) return <Text style={{ color: colors.mutedForeground, marginVertical: 24, textAlign: 'center' }}>Nothing here yet.</Text>;
  return null;
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontFamily: 'Poppins_700Bold', marginBottom: 18 },
  subtitle: { fontSize: 15, fontFamily: 'Poppins_400Regular', marginBottom: 10 },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  button: { minHeight: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 12 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  input: { borderWidth: 1, borderRadius: 14, padding: 12, marginVertical: 5, fontSize: 16, fontFamily: 'Poppins_400Regular' },
});