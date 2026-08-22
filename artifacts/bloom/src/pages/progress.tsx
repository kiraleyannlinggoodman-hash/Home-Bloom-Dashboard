import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getListProgressGradesQueryKey,
  type ProgressGrade,
  type ProgressGradeInput,
  useCreateProgressGrade,
  useDeleteProgressGrade,
  useListProgressGrades,
  useListSubjects,
  useUpdateProgressGrade,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUpRight, BookOpen, Check, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";

const TERMS = [
  { key: "term1", label: "Term 1", short: "T1" },
  { key: "term2", label: "Term 2", short: "T2" },
  { key: "term3", label: "Term 3", short: "T3" },
  { key: "term4", label: "Term 4", short: "T4" },
] as const;

type TermKey = (typeof TERMS)[number]["key"];
type GradeDraft = {
  subject: string;
  term1: number | null;
  term2: number | null;
  term3: number | null;
  term4: number | null;
};

const chartColors = ["#c57c99", "#927aa8", "#8aab8b", "#d59b70"];

function gradeDraft(grade: ProgressGrade): GradeDraft {
  return {
    subject: grade.subject,
    term1: grade.term1 ?? null,
    term2: grade.term2 ?? null,
    term3: grade.term3 ?? null,
    term4: grade.term4 ?? null,
  };
}

function gradeLabel(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length || payload[0]?.value == null) return null;
  return (
    <div className="rounded-2xl border border-[#ecd9df] bg-[#fffdf9] px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-[#a85f7c]">{payload[0].value}%</p>
    </div>
  );
}

function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center rounded-2xl bg-[#fbf4f1] text-center">
      <span className="text-3xl">🌱</span>
      <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

function TermPerformanceChart({ grades, selectedTerm, onSelectTerm }: {
  grades: ProgressGrade[];
  selectedTerm: TermKey;
  onSelectTerm: (term: TermKey) => void;
}) {
  const term = TERMS.find((item) => item.key === selectedTerm) ?? TERMS[0];
  const data = grades
    .filter((grade) => grade[selectedTerm] != null)
    .map((grade) => ({ subject: grade.subject, score: grade[selectedTerm] as number }));

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae7089]">A gentle overview</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground" data-testid="heading-term-performance">
            {term.label} performance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">See how each subject is taking root.</p>
        </div>
        <div className="flex w-fit rounded-2xl bg-[#f7e9ec] p-1" role="tablist" aria-label="Select term">
          {TERMS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedTerm === item.key}
              data-testid={`tab-${item.key}`}
              onClick={() => onSelectTerm(item.key)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:px-4",
                selectedTerm === item.key ? "bg-[#fffdf9] text-[#9b5d78] shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <ChartEmpty>No grades for {term.label} yet. Add one below when you feel ready. 📝</ChartEmpty>
      ) : (
        <div className="h-[285px] w-full" data-testid="chart-term-performance">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 8, left: -24, bottom: 4 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#f0e3e3" strokeDasharray="4 5" />
              <XAxis dataKey="subject" tick={{ fill: "#8c7d80", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "#aa9b9d", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#fbf0f1" }} content={<ChartTooltip />} />
              <Bar dataKey="score" radius={[10, 10, 3, 3]} maxBarSize={48}>
                {data.map((entry, index) => <Cell key={`${entry.subject}-${index}`} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function SubjectLineChart({ grade, color }: { grade: ProgressGrade; color: string }) {
  const data = TERMS.map((term) => ({
    term: term.label,
    score: grade[term.key] == null ? undefined : grade[term.key],
  }));
  const hasGrades = data.some((item) => item.score != null);
  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae7089]">Subject journey</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground" data-testid={`heading-subject-${grade.id}`}>
          {grade.subject} <span className="text-[#d5a4b8]">🌸</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">A line through your recorded terms — future terms stay open.</p>
      </div>
      {!hasGrades ? (
        <ChartEmpty>There are no marks here yet. Your first note in this subject can start anywhere. 🧠</ChartEmpty>
      ) : (
        <div className="h-[285px] w-full" data-testid={`chart-subject-${grade.id}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 14, right: 10, left: -22, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#f0e3e3" strokeDasharray="4 5" />
              <XAxis dataKey="term" tick={{ fill: "#8c7d80", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: "#aa9b9d", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="score" stroke={color} strokeWidth={3} dot={{ r: 5, fill: "#fffdf9", stroke: color, strokeWidth: 3 }} activeDot={{ r: 7 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ grades }: { grades: ProgressGrade[] }) {
  const [selectedTerm, setSelectedTerm] = useState<TermKey>("term1");
  const [selectedTab, setSelectedTab] = useState("overview");
  const tabs = useMemo(() => [{ id: "overview", label: "Term performance", emoji: "📊" }, ...grades.map((grade, index) => ({ id: String(grade.id), label: grade.subject, emoji: index % 2 ? "🧠" : "🌿" }))], [grades]);
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : "overview";
  const tabValue = activeTab === "overview" ? "overview" : Number(activeTab);
  const selectedGrade = typeof tabValue === "number" ? grades.find((grade) => grade.id === tabValue) : undefined;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#eadbda] bg-[#fffdf9] shadow-[0_14px_50px_rgba(119,74,87,0.07)]" data-testid="progress-chart-panel">
      <div className="flex gap-2 overflow-x-auto border-b border-[#f0e4e2] px-4 pt-4 sm:px-7 sm:pt-5" role="tablist" aria-label="Progress chart views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={`tab-chart-${tab.id}`}
            onClick={() => setSelectedTab(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
              activeTab === tab.id ? "border-[#c57c99] text-[#9b5d78]" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.emoji}</span>{tab.label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-8">
        {selectedGrade ? <SubjectLineChart grade={selectedGrade} color={chartColors[grades.findIndex((grade) => grade.id === selectedGrade.id) % chartColors.length]} /> : <TermPerformanceChart grades={grades} selectedTerm={selectedTerm} onSelectTerm={setSelectedTerm} />}
      </div>
    </section>
  );
}

function ScoreInput({ value, rowId, term, onChange }: { value: number | null; rowId: number | string; term: TermKey; onChange: (value: string) => void }) {
  return (
    <Input
      type="number"
      min={0}
      max={100}
      step={1}
      inputMode="numeric"
      placeholder="—"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      data-testid={`input-${term}-${rowId}`}
      aria-label={`${term} grade`}
      className="h-11 rounded-xl border-[#eadbda] bg-[#fffdfa] text-center font-semibold tabular-nums shadow-none focus-visible:border-[#c57c99] focus-visible:ring-[#f2dce3]"
    />
  );
}

function GradeRow({ grade, subjects, draft, onChange, onSave, onDelete, saving }: {
  grade: ProgressGrade;
  subjects: Array<{ id: number; name: string; emoji: string }>;
  draft: GradeDraft;
  onChange: (field: keyof GradeDraft, value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const changed = JSON.stringify(draft) !== JSON.stringify(gradeDraft(grade));
  return (
    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group border-b border-[#f0e5e2] last:border-0">
      <td className="min-w-[180px] px-4 py-4 sm:px-5">
        <select
          value={draft.subject}
          onChange={(event) => onChange("subject", event.target.value)}
          data-testid={`select-subject-${grade.id}`}
          aria-label="Subject"
          className="h-11 w-full rounded-xl border border-[#eadbda] bg-[#fffdfa] px-3 text-sm font-semibold text-foreground outline-none focus:border-[#c57c99] focus:ring-2 focus:ring-[#f2dce3]"
        >
          {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.emoji} {subject.name}</option>)}
          <option value="Other">🎀 Other</option>
        </select>
      </td>
      {TERMS.map((term) => (
        <td key={term.key} className="min-w-[92px] px-2 py-4">
          <ScoreInput value={draft[term.key]} rowId={grade.id} term={term.key} onChange={(value) => onChange(term.key, value)} />
        </td>
      ))}
      <td className="w-[92px] px-3 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {changed && (
            <Button type="button" size="icon" variant="ghost" onClick={onSave} disabled={saving} data-testid={`button-save-grade-${grade.id}`} aria-label={`Save ${grade.subject}`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-[#9b5d78]" />}
            </Button>
          )}
          <Button type="button" size="icon" variant="ghost" onClick={onDelete} disabled={saving} data-testid={`button-delete-grade-${grade.id}`} aria-label={`Delete ${grade.subject}`} className="text-muted-foreground hover:bg-[#fbe9ec] hover:text-[#a85f7c]">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 px-5 py-6" data-testid="loading-progress">
      {[1, 2, 3].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-[#f8ecec]" />)}
    </div>
  );
}

export default function Progress() {
  const queryClient = useQueryClient();
  const gradesQuery = useListProgressGrades();
  const subjectsQuery = useListSubjects();
  const grades = gradesQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const createGrade = useCreateProgressGrade();
  const updateGrade = useUpdateProgressGrade();
  const deleteGrade = useDeleteProgressGrade();
  const [drafts, setDrafts] = useState<Record<number, GradeDraft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const getDraft = (grade: ProgressGrade) => drafts[grade.id] ?? gradeDraft(grade);
  const patchDraft = (id: number, field: keyof GradeDraft, value: string) => {
    setDrafts((current) => {
      const existing = current[id] ?? gradeDraft(grades.find((grade) => grade.id === id)!);
      const nextValue = field === "subject" ? value : (value === "" ? null : Math.max(0, Math.min(100, Number(value))));
      return { ...current, [id]: { ...existing, [field]: nextValue } };
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListProgressGradesQueryKey() });
  const saveGrade = (grade: ProgressGrade) => {
    const draft = getDraft(grade);
    if (!draft.subject.trim()) return;
    setSavingId(grade.id);
    updateGrade.mutate({ id: grade.id, data: draft }, {
      onSuccess: () => { setDrafts((current) => { const next = { ...current }; delete next[grade.id]; return next; }); invalidate(); setSavingId(null); },
      onError: () => setSavingId(null),
    });
  };
  const addGrade = () => {
    const existingSubjects = new Set(grades.map((grade) => grade.subject));
    const unusedSubject = subjects.find((subject) => !existingSubjects.has(subject.name))?.name;
    let fallbackSubject = unusedSubject ?? "Other";
    let suffix = 2;
    while (existingSubjects.has(fallbackSubject)) {
      fallbackSubject = `Other ${suffix}`;
      suffix += 1;
    }
    const data: ProgressGradeInput = { subject: fallbackSubject, term1: null, term2: null, term3: null, term4: null };
    createGrade.mutate({ data }, { onSuccess: invalidate });
  };
  const removeGrade = (grade: ProgressGrade) => {
    if (!window.confirm(`Remove the ${grade.subject} progress row?`)) return;
    deleteGrade.mutate({ id: grade.id }, { onSuccess: invalidate });
  };
  const hasQueryError = gradesQuery.isError || subjectsQuery.isError;

  return (
    <AppLayout>
      <div className="space-y-8 pb-10 md:space-y-10" data-testid="progress-page">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#f7dfe5] text-3xl shadow-sm">🌸</div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#ae7089]">Your learning garden</p>
              <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" data-testid="heading-progress">Grade progress</h1>
              <p className="mt-2 max-w-xl text-[1.05rem] leading-7 text-muted-foreground">A quiet place to notice the little wins as they grow. 🌿</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-[#eef3e9] px-4 py-2 text-xs font-semibold text-[#5f8064] sm:flex"><BookOpen className="h-4 w-4" /> Keep going, gently</div>
        </header>

        {hasQueryError ? (
          <div className="rounded-[2rem] border border-[#efd5d6] bg-[#fff8f6] px-6 py-12 text-center" data-testid="error-progress">
            <span className="text-3xl">🩷</span>
            <h2 className="mt-3 font-serif text-2xl font-semibold">Your garden is taking a moment</h2>
            <p className="mt-2 text-sm text-muted-foreground">We couldn’t bring in your grades just yet.</p>
            <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={() => { gradesQuery.refetch(); subjectsQuery.refetch(); }} data-testid="button-retry-progress"><RotateCcw className="mr-2 h-4 w-4" /> Try again</Button>
          </div>
        ) : gradesQuery.isLoading ? (
          <><div className="h-[420px] animate-pulse rounded-[2rem] bg-[#f8ecec]" /><div className="overflow-hidden rounded-[2rem] border border-[#eadbda] bg-[#fffdf9]"><TableSkeleton /></div></>
        ) : (
          <>
            <ChartPanel grades={grades} />
            <section className="overflow-hidden rounded-[2rem] border border-[#eadbda] bg-[#fffdf9] shadow-[0_14px_50px_rgba(119,74,87,0.05)]" data-testid="progress-table-section">
              <div className="flex flex-col gap-3 border-b border-[#f0e4e2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-serif text-2xl font-semibold">Your grade rows</h2><span className="text-lg">📝</span></div>
                  <p className="mt-1 text-sm text-muted-foreground">Leave a term blank if it hasn’t happened yet.</p>
                </div>
                <Button type="button" onClick={addGrade} disabled={createGrade.isPending} className="w-full rounded-full bg-[#c57c99] text-[#fffdf9] shadow-sm hover:bg-[#b96f8d] sm:w-auto" data-testid="button-add-grade">
                  {createGrade.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add row
                </Button>
              </div>
              {grades.length === 0 ? (
                <div className="px-6 py-16 text-center" data-testid="empty-progress">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f7e9ec] text-3xl">🌱</div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold">Nothing planted yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Add your first subject row and let this little notebook become yours. 📚</p>
                  <Button type="button" onClick={addGrade} disabled={createGrade.isPending} className="mt-5 rounded-full bg-[#c57c99] text-[#fffdf9]" data-testid="button-add-first-grade"><Plus className="mr-2 h-4 w-4" /> Add your first row</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead className="bg-[#fbf5f1] text-[11px] font-bold uppercase tracking-[0.14em] text-[#a28d91]">
                      <tr><th className="px-4 py-4 sm:px-5">Subject</th>{TERMS.map((term) => <th key={term.key} className="px-2 py-4 text-center">{term.label}</th>)}<th className="px-3 py-4 text-right"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      {grades.map((grade) => <GradeRow key={grade.id} grade={grade} subjects={subjects} draft={getDraft(grade)} onChange={(field, value) => patchDraft(grade.id, field, value)} onSave={() => saveGrade(grade)} onDelete={() => removeGrade(grade)} saving={savingId === grade.id || deleteGrade.isPending} />)}
                    </tbody>
                  </table>
                </div>
              )}
              {grades.length > 0 && <div className="flex items-center gap-2 border-t border-[#f0e4e2] px-5 py-3.5 text-xs text-muted-foreground sm:px-7"><ArrowUpRight className="h-3.5 w-3.5 text-[#c57c99]" /> Changes save per row — a check appears when a row is ready.</div>}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}