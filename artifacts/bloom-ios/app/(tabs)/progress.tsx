import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useCreateProgressGrade, useDeleteProgressGrade, useListProgressGrades, useListSubjects, useUpdateProgressGrade, type ProgressGrade } from '@workspace/api-client-react';
import { Button, Card, Screen, State } from '@/components/native-ui';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';

const TERMS = [
  { key: 'term1', label: 'Term 1', short: 'T1' },
  { key: 'term2', label: 'Term 2', short: 'T2' },
  { key: 'term3', label: 'Term 3', short: 'T3' },
  { key: 'term4', label: 'Term 4', short: 'T4' },
] as const;
type TermKey = (typeof TERMS)[number]['key'];

function gradeLabel(value: number | null | undefined) {
  return value == null ? '—' : `${value}%`;
}

function averageFor(grade: ProgressGrade) {
  const values = TERMS.map((term) => grade[term.key]).filter((value): value is number => value != null);
  if (!values.length) return null;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function ChartEmpty({ message }: { message: string }) {
  const colors = useColors();
  return <View style={[progressStyles.chartEmpty, { backgroundColor: colors.muted }]}><Text style={progressStyles.emptyEmoji}>🌱</Text><Text style={[progressStyles.emptyText, { color: colors.mutedForeground }]}>{message}</Text></View>;
}

function TermBarChart({ grades, selectedTerm }: { grades: ProgressGrade[]; selectedTerm: TermKey }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(300, width - 72);
  const data = grades.filter((grade) => grade[selectedTerm] != null);
  if (!data.length) return <ChartEmpty message={`No grades for ${TERMS.find((term) => term.key === selectedTerm)?.label} yet.`} />;
  const chartHeight = 174;
  const plotHeight = 136;
  const barWidth = Math.max(30, Math.min(44, (chartWidth - 36) / Math.max(data.length, 1) - 10));
  return (
    <View>
      <View style={progressStyles.chartLegend}><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>100%</Text><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>50%</Text><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>0%</Text></View>
      <View style={[progressStyles.barChart, { height: chartHeight, width: chartWidth, borderBottomColor: colors.border }]}>
        {[0, 0.5, 1].map((position) => <View key={position} style={[progressStyles.gridLine, { top: 10 + plotHeight * position, backgroundColor: colors.border }]} />)}
        <View style={progressStyles.barRow}>
          {data.map((grade, index) => {
            const score = grade[selectedTerm] as number;
            const barColor = [colors.primary, colors.secondaryForeground, colors.accentForeground, colors.mutedForeground][index % 4];
            return <View key={grade.id} style={[progressStyles.barColumn, { width: barWidth }]}><Text style={[progressStyles.barValue, { color: colors.foreground }]}>{score}%</Text><View style={[progressStyles.bar, { height: Math.max(5, plotHeight * score / 100), backgroundColor: barColor }]} /><Text style={[progressStyles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{grade.subject}</Text></View>;
          })}
        </View>
      </View>
    </View>
  );
}

function lineSegments(values: Array<number | null>, width: number, height: number) {
  const top = 10;
  const bottom = height - 14;
  const step = width / (TERMS.length - 1);
  const points = values.map((value, index) => value == null ? null : `${index * step},${bottom - ((value / 100) * (bottom - top))}`);
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((point) => {
    if (point) current.push(point);
    else if (current.length) { segments.push(current.join(' ')); current = []; }
  });
  if (current.length) segments.push(current.join(' '));
  return { points, segments };
}

function SubjectLineChart({ grade, color }: { grade: ProgressGrade; color: string }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(280, width - 72);
  const chartHeight = 156;
  const values = TERMS.map((term) => grade[term.key] ?? null);
  const { points, segments } = lineSegments(values, chartWidth - 36, chartHeight);
  return (
    <View>
      <View style={progressStyles.chartLegend}><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>100%</Text><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>50%</Text><Text style={[progressStyles.axisLabel, { color: colors.mutedForeground }]}>0%</Text></View>
      <View style={{ width: chartWidth, height: chartHeight }}>
        {[0, 0.5, 1].map((position) => <View key={position} style={[progressStyles.gridLine, { top: 10 + (chartHeight - 24) * position, left: 0, right: 0, backgroundColor: colors.border }]} />)}
        <Svg width={chartWidth - 36} height={chartHeight} style={{ marginLeft: 30 }}>
          {segments.map((segment) => <Polyline key={segment} points={segment} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}
          {points.map((point, index) => point ? <Circle key={`${grade.id}-${index}`} cx={point.split(',')[0]} cy={point.split(',')[1]} r={5} fill={colors.card} stroke={color} strokeWidth={3} /> : null)}
        </Svg>
      </View>
      <View style={progressStyles.termLabels}>{TERMS.map((term) => <Text key={term.key} style={[progressStyles.termLabel, { color: colors.mutedForeground }]}>{term.short}</Text>)}</View>
    </View>
  );
}

function GradeRow({ grade, onUpdate, onDelete }: { grade: ProgressGrade; onUpdate: (term: TermKey, value: string) => void; onDelete: () => void }) {
  const colors = useColors();
  const average = averageFor(grade);
  return (
    <Card>
      <View style={progressStyles.rowHeader}>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={[progressStyles.subjectName, { color: colors.foreground }]} numberOfLines={1}>{grade.subject}</Text><Text style={[progressStyles.rowHint, { color: colors.mutedForeground }]}>Edit each term as it arrives</Text></View>
        <View style={[progressStyles.averagePill, { backgroundColor: colors.muted }]}><Text style={[progressStyles.averageText, { color: colors.secondaryForeground }]}>{average == null ? 'No marks' : `${average}% avg`}</Text></View>
        <Pressable testID={`delete-grade-${grade.id}`} accessibilityLabel={`Delete ${grade.subject}`} onPress={onDelete} style={[progressStyles.deleteButton, { borderColor: colors.border }]}><Text style={{ color: colors.destructive }}>×</Text></Pressable>
      </View>
      <View style={progressStyles.gradeGrid}>
        {TERMS.map((term) => <View key={term.key} style={progressStyles.gradeCell}><Text style={[progressStyles.termInputLabel, { color: colors.mutedForeground }]}>{term.short}</Text><TextInput testID={`grade-${grade.id}-${term.key}`} defaultValue={grade[term.key]?.toString() ?? ''} onEndEditing={(event) => onUpdate(term.key, event.nativeEvent.text)} onSubmitEditing={(event) => onUpdate(term.key, event.nativeEvent.text)} placeholder="—" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={[progressStyles.gradeInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background }]} /></View>)}
      </View>
    </Card>
  );
}

export default function Progress() {
  const colors = useColors();
  const gradesQuery = useListProgressGrades();
  const subjectsQuery = useListSubjects();
  const grades = gradesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const create = useCreateProgressGrade();
  const update = useUpdateProgressGrade();
  const remove = useDeleteProgressGrade();
  const [selectedTerm, setSelectedTerm] = useState<TermKey>('term1');
  const chartColors = [colors.primary, colors.secondaryForeground, colors.accentForeground, colors.mutedForeground];
  const hasError = gradesQuery.isError || subjectsQuery.isError;

  const addGrade = () => {
    const existing = new Set(grades.map((grade) => grade.subject));
    const subject = subjects.find((item) => !existing.has(item.name))?.name ?? `Other ${grades.length + 1}`;
    create.mutate({ data: { subject, term1: null, term2: null, term3: null, term4: null } }, { onSuccess: () => gradesQuery.refetch() });
  };
  const updateGrade = (id: number, term: TermKey, rawValue: string) => {
    const parsed = rawValue.trim() === '' ? null : Math.max(0, Math.min(100, Number(rawValue)));
    if (parsed !== null && Number.isNaN(parsed)) return;
    update.mutate({ id, data: { [term]: parsed } }, { onSuccess: () => gradesQuery.refetch() });
  };
  const deleteGrade = (grade: ProgressGrade) => {
    Alert.alert('Remove progress row?', `Remove ${grade.subject} from your grade tracker?`, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate({ id: grade.id }, { onSuccess: () => gradesQuery.refetch() }) }]);
  };

  return (
    <Screen title="Grade progress">
      <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" bottomOffset={24} contentContainerStyle={progressStyles.scrollContent}>
        <Text style={[progressStyles.eyebrow, { color: colors.secondaryForeground }]}>Your learning garden</Text>
        <Text style={[progressStyles.subtitle, { color: colors.mutedForeground }]}>Notice the little wins as they grow. 🌿</Text>
        {hasError ? <Card><Text style={[progressStyles.errorTitle, { color: colors.foreground }]}>Your garden is taking a moment</Text><Text style={[progressStyles.rowHint, { color: colors.mutedForeground }]}>We couldn’t bring in your grades just yet.</Text><Button testID="progress-retry" onPress={() => { gradesQuery.refetch(); subjectsQuery.refetch(); }}>Try again</Button></Card> : null}
        <State loading={gradesQuery.isLoading} error={hasError ? undefined : gradesQuery.error} />
        {!gradesQuery.isLoading && !hasError && <View>
          <Card><Text style={[progressStyles.chartEyebrow, { color: colors.secondaryForeground }]}>A gentle overview</Text><Text style={[progressStyles.chartTitle, { color: colors.foreground }]}>{TERMS.find((term) => term.key === selectedTerm)?.label} performance</Text><Text style={[progressStyles.chartDescription, { color: colors.mutedForeground }]}>See how each subject is taking root.</Text><View style={progressStyles.termTabs}>{TERMS.map((term) => <Pressable key={term.key} testID={`progress-term-${term.key}`} onPress={() => setSelectedTerm(term.key)} style={[progressStyles.termTab, { backgroundColor: colors.muted }, selectedTerm === term.key && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}><Text style={[progressStyles.termTabText, { color: selectedTerm === term.key ? colors.secondaryForeground : colors.mutedForeground }]}>{term.short}</Text></Pressable>)}</View><TermBarChart grades={grades} selectedTerm={selectedTerm} /></Card>
          <View style={progressStyles.sectionHeader}><View><Text style={[progressStyles.sectionTitle, { color: colors.foreground }]}>Every subject</Text><Text style={[progressStyles.chartDescription, { color: colors.mutedForeground }]}>A line through each recorded term.</Text></View><Text style={[progressStyles.countBadge, { color: colors.secondaryForeground }]}>{grades.length} chart{grades.length === 1 ? '' : 's'}</Text></View>
          {grades.length === 0 ? <Card><ChartEmpty message="Add your first subject row and start your little notebook." /><Button testID="progress-add-first" onPress={addGrade}>Add your first row</Button></Card> : grades.map((grade, index) => <Card key={`chart-${grade.id}`}><Text style={[progressStyles.chartEyebrow, { color: colors.secondaryForeground }]}>Subject journey</Text><Text style={[progressStyles.chartTitle, { color: colors.foreground }]}>{grade.subject} 🌸</Text><Text style={[progressStyles.chartDescription, { color: colors.mutedForeground }]}>Future terms stay open.</Text><SubjectLineChart grade={grade} color={chartColors[index % chartColors.length]} /></Card>)}
          <View style={progressStyles.sectionHeader}><View><Text style={[progressStyles.sectionTitle, { color: colors.foreground }]}>Your grade rows</Text><Text style={[progressStyles.chartDescription, { color: colors.mutedForeground }]}>Leave a term blank if it hasn’t happened yet.</Text></View><Pressable testID="progress-add-row" onPress={addGrade} disabled={create.isPending} style={[progressStyles.addRowButton, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontFamily: 'Poppins_600SemiBold' }}>＋ Add</Text></Pressable></View>
          {grades.map((grade) => <GradeRow key={grade.id} grade={grade} onUpdate={(term, value) => updateGrade(grade.id, term, value)} onDelete={() => deleteGrade(grade)} />)}
        </View>}
      </KeyboardAwareScrollViewCompat>
    </Screen>
  );
}

const progressStyles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  eyebrow: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 14 },
  chartEyebrow: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  chartTitle: { fontFamily: 'Poppins_700Bold', fontSize: 21, marginTop: 5 },
  chartDescription: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, marginTop: 3 },
  termTabs: { flexDirection: 'row', alignSelf: 'flex-start', gap: 5, borderRadius: 14, padding: 4, marginTop: 14, marginBottom: 12 },
  termTab: { minWidth: 42, alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  termTabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  chartLegend: { position: 'absolute', left: 0, top: 0, bottom: 14, justifyContent: 'space-between', zIndex: 2 },
  axisLabel: { fontFamily: 'Poppins_400Regular', fontSize: 9 },
  barChart: { marginLeft: 28, position: 'relative', borderBottomWidth: 1, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, opacity: 0.65 },
  barRow: { height: 174, flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 8, paddingTop: 16 },
  barColumn: { height: 164, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', minHeight: 5, borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  barValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, marginBottom: 3 },
  barLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, marginTop: 5, maxWidth: 50 },
  chartEmpty: { minHeight: 136, alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 18 },
  emptyEmoji: { fontSize: 25 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  termLabels: { flexDirection: 'row', justifyContent: 'space-around', marginLeft: 30, marginRight: 6, marginTop: -2 },
  termLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 5, marginBottom: 10 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  countBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectName: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  rowHint: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  averagePill: { borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5 },
  averageText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  deleteButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gradeGrid: { flexDirection: 'row', gap: 7, marginTop: 12 },
  gradeCell: { flex: 1 },
  termInputLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, marginBottom: 3, textAlign: 'center' },
  gradeInput: { borderRadius: 12, borderWidth: 1, height: 42, fontFamily: 'Poppins_600SemiBold', fontSize: 15, textAlign: 'center' },
  addRowButton: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  errorTitle: { fontFamily: 'Poppins_700Bold', fontSize: 17 },
});