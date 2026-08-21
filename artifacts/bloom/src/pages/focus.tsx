import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFocusSessions,
  useStartFocusSession,
  useEndFocusSession,
  useDeleteFocusSession,
  useGetFocusStats,
  useListSubjects,
  useGetDashboardSummary,
  getListFocusSessionsQueryKey,
  getGetFocusStatsQueryKey,
  getGetDashboardSummaryQueryKey,
  type FocusSession,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

type TimerState = "idle" | "running" | "paused" | "reflecting";

const SESSION_TYPES = [
  { value: "homework", label: "Homework", emoji: "📖" },
  { value: "study", label: "Study", emoji: "📚" },
  { value: "revision", label: "Revision", emoji: "📝" },
  { value: "practice", label: "Practice", emoji: "🎯" },
  { value: "other", label: "Other", emoji: "🌸" },
];

const QUOTES = [
  { emoji: "🌷", text: "Stay focused, you're blooming." },
  { emoji: "🌸", text: "Small progress is still progress." },
  { emoji: "✨", text: "Every minute counts." },
  { emoji: "🌼", text: "Bloom at your own pace." },
  { emoji: "🌱", text: "Your efforts are taking root." },
  { emoji: "💫", text: "You are capable of amazing things." },
];

const CELEBRATIONS = [
  "🌸 Amazing work! Keep blooming.",
  "🌷 Another step toward your goals.",
  "✨ Consistency creates success.",
  "🌼 Your focus is growing stronger every day.",
];

const PETAL_EMOJIS = ["🌸", "🌷", "✨", "🌼", "🌸", "✨", "🌷", "🌼"];
const CHART_PINK = "#E9A8C2";
const CHART_ROSE = "#F6C5D8";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short", day: "numeric" });
}

function shortWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function sessionTypeEmoji(type: string): string {
  return SESSION_TYPES.find((t) => t.value === type)?.emoji ?? "🌸";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FloatingPetals() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {PETAL_EMOJIS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl select-none"
          style={{ left: `${8 + i * 11}%`, bottom: "5%" }}
          initial={{ y: 0, opacity: 1, scale: 0.6 }}
          animate={{ y: -520, opacity: 0, scale: 1.2, rotate: i % 2 === 0 ? 20 : -20 }}
          transition={{ duration: 2.2 + i * 0.2, delay: i * 0.12, ease: "easeOut" }}
        >
          {p}
        </motion.span>
      ))}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-1 bg-card rounded-3xl px-6 py-5 shadow-sm border border-primary/10 min-w-[110px]"
      style={{ boxShadow: "0 0 20px rgba(233,168,194,0.15)" }}
    >
      <span className="text-3xl">🔥</span>
      <span className="text-3xl font-serif font-bold text-foreground leading-none">{streak}</span>
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Day Streak</span>
    </motion.div>
  );
}

function QualityPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
            value === n
              ? "bg-primary text-primary-foreground shadow-md scale-110"
              : "bg-secondary/60 text-muted-foreground hover:bg-primary/20"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm border border-primary/5 flex flex-col gap-2">
      <span className="text-2xl">{emoji}</span>
      <span className="text-2xl font-serif font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FocusTracker() {
  const queryClient = useQueryClient();

  // Timer
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup form
  const [sessionName, setSessionName] = useState("");
  const [sessionSubject, setSessionSubject] = useState("");
  const [sessionType, setSessionType] = useState("study");
  const [sessionNotes, setSessionNotes] = useState("");

  // Reflection
  const [focusQuality, setFocusQuality] = useState<number | null>(null);
  const [wentWell, setWentWell] = useState("");
  const [distracted, setDistracted] = useState("");
  const [reflectionNotes, setReflectionNotes] = useState("");

  // UI
  const [showPetals, setShowPetals] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);

  // History filters
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Quote rotation
  useEffect(() => {
    const t = setInterval(() => setQuoteIndex((i) => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // API
  const { data: subjects = [] } = useListSubjects();
  const { data: dashSummary } = useGetDashboardSummary();
  const { data: sessions = [] } = useListFocusSessions({
    search: debouncedSearch || undefined,
    subject: filterSubject !== "all" ? filterSubject : undefined,
    sort: sortOrder,
  });
  const { data: stats } = useGetFocusStats();
  const startSession = useStartFocusSession();
  const endSession = useEndFocusSession();
  const deleteSession = useDeleteFocusSession();

  const streak = dashSummary?.focusStreakDays ?? 0;
  const quote = QUOTES[quoteIndex];
  const isRunning = timerState === "running";

  // ── Timer controls ──

  function triggerPetals() {
    setShowPetals(true);
    setTimeout(() => setShowPetals(false), 2800);
  }

  async function handleStart() {
    if (!sessionName.trim()) return;
    try {
      const result = await startSession.mutateAsync({
        data: {
          name: sessionName,
          subject: sessionSubject || undefined,
          sessionType: sessionType as "homework" | "study" | "revision" | "practice" | "other",
          notes: sessionNotes || undefined,
        },
      });
      setActiveSessionId(result.id);
      setElapsedSeconds(0);
      setTimerState("running");
      triggerPetals();
      intervalRef.current = setInterval(
        () => setElapsedSeconds((s) => s + 1),
        1000,
      );
    } catch {
      // silently fail — user sees button return to normal
    }
  }

  function handlePause() {
    setTimerState("paused");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleResume() {
    setTimerState("running");
    intervalRef.current = setInterval(
      () => setElapsedSeconds((s) => s + 1),
      1000,
    );
  }

  function handleEnd() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState("reflecting");
  }

  async function handleSubmitReflection(skip = false) {
    if (!activeSessionId) return;
    try {
      await endSession.mutateAsync({
        id: activeSessionId,
        data: {
          durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
          ...(skip ? {} : {
            focusQuality: focusQuality ?? undefined,
            wentWell: wentWell || undefined,
            distracted: distracted || undefined,
            reflectionNotes: reflectionNotes || undefined,
          }),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListFocusSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFocusStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

      if (!skip) {
        const msg = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)];
        setCelebration(msg);
        setTimeout(() => setCelebration(null), 5000);
        triggerPetals();
      }
    } finally {
      // Reset everything
      setTimerState("idle");
      setElapsedSeconds(0);
      setActiveSessionId(null);
      setSessionName("");
      setSessionSubject("");
      setSessionType("study");
      setSessionNotes("");
      setFocusQuality(null);
      setWentWell("");
      setDistracted("");
      setReflectionNotes("");
    }
  }

  async function handleDeleteSession(id: number) {
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFocusSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFocusStatsQueryKey() });
  }

  // ── Chart data ──

  const byDayData = (() => {
    const map: Record<string, number> = {};
    (stats?.byDay ?? []).forEach((d) => { map[d.date] = d.minutes; });
    return lastNDays(14).map((date) => ({
      date,
      label: shortDate(date),
      hours: parseFloat(((map[date] ?? 0) / 60).toFixed(1)),
    }));
  })();

  const bySubjectData = (stats?.bySubject ?? [])
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 8)
    .map((d) => ({ subject: d.subject, hours: parseFloat((d.minutes / 60).toFixed(1)) }));

  const byWeekData = (() => {
    const sorted = [...(stats?.byWeek ?? [])].sort((a, b) =>
      a.week.localeCompare(b.week),
    );
    return sorted.slice(-8).map((d) => ({
      week: shortWeek(d.week),
      hours: parseFloat((d.minutes / 60).toFixed(1)),
    }));
  })();

  // Unique subjects in history for filter
  const historySubjects = Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean)));

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* Floating petals overlay */}
      <AnimatePresence>{showPetals && <FloatingPetals />}</AnimatePresence>

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm">
          🎯
        </div>
        <div>
          <h1 className="text-4xl font-serif font-semibold text-foreground">Focus Tracker</h1>
          <p className="text-muted-foreground mt-0.5">
            Your peaceful space to study and grow.
          </p>
        </div>
      </div>

      {/* ── Celebration banner ── */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="mb-6 bg-gradient-to-r from-primary/20 via-secondary to-primary/10 rounded-3xl px-6 py-4 text-center text-lg font-serif text-foreground shadow-sm"
          >
            {celebration}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Timer + Streak row ── */}
      <div className="flex flex-col md:flex-row gap-4 items-start mb-8">
        {/* Timer card */}
        <motion.div
          className="flex-1 rounded-[2rem] overflow-hidden shadow-md"
          animate={
            isRunning
              ? {
                  boxShadow: [
                    "0 0 20px rgba(233,168,194,0.2)",
                    "0 0 40px rgba(233,168,194,0.45)",
                    "0 0 20px rgba(233,168,194,0.2)",
                  ],
                }
              : { boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }
          }
          transition={isRunning ? { duration: 2.5, repeat: Infinity } : {}}
        >
          <div className="bg-gradient-to-br from-primary/30 via-secondary/60 to-primary/10 p-8 flex flex-col items-center gap-4">
            {/* Bloom icon */}
            <motion.span
              className="text-5xl"
              animate={isRunning ? { scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={isRunning ? { duration: 4, repeat: Infinity } : {}}
            >
              🌸
            </motion.span>

            {/* Timer display */}
            <div className="text-6xl md:text-7xl font-mono font-bold text-foreground tracking-tight">
              {formatTime(elapsedSeconds)}
            </div>

            {/* Status label */}
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {timerState === "idle" && "Ready to bloom"}
              {timerState === "running" && "Blooming…"}
              {timerState === "paused" && "Paused — take a breath"}
              {timerState === "reflecting" && "Session complete"}
            </div>

            {/* Rotating quote */}
            <AnimatePresence mode="wait">
              <motion.p
                key={quoteIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-muted-foreground text-center max-w-xs"
              >
                {quote.emoji} {quote.text}
              </motion.p>
            </AnimatePresence>

            {/* Timer controls */}
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              {timerState === "idle" && (
                <Button
                  onClick={handleStart}
                  disabled={!sessionName.trim() || startSession.isPending}
                  className="rounded-full px-8 py-5 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                >
                  ▶ Start
                </Button>
              )}
              {timerState === "running" && (
                <>
                  <Button
                    onClick={handlePause}
                    variant="outline"
                    className="rounded-full px-7 py-5 text-base border-primary/30 hover:bg-primary/10"
                  >
                    ⏸ Pause
                  </Button>
                  <Button
                    onClick={handleEnd}
                    className="rounded-full px-7 py-5 text-base bg-foreground/80 text-background hover:bg-foreground"
                  >
                    ⏹ End
                  </Button>
                </>
              )}
              {timerState === "paused" && (
                <>
                  <Button
                    onClick={handleResume}
                    className="rounded-full px-7 py-5 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  >
                    ▶ Resume
                  </Button>
                  <Button
                    onClick={handleEnd}
                    variant="outline"
                    className="rounded-full px-7 py-5 text-base border-primary/30 hover:bg-primary/10"
                  >
                    ⏹ End
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Setup form — shown only when idle */}
          <AnimatePresence>
            {timerState === "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card px-8 py-6 flex flex-col gap-4 overflow-hidden"
              >
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  🌱 Set up your session
                </p>

                {/* Session name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="session-name">Session Name *</Label>
                  <Input
                    id="session-name"
                    placeholder="e.g. Chapter 5 review…"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="session-subject">Subject</Label>
                  <select
                    id="session-subject"
                    value={sessionSubject}
                    onChange={(e) => setSessionSubject(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— No subject —</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.emoji} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session type */}
                <div className="flex flex-col gap-2">
                  <Label>Session Type</Label>
                  <div className="flex gap-2 flex-wrap">
                    {SESSION_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setSessionType(t.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          sessionType === t.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/60 text-muted-foreground hover:bg-primary/15"
                        }`}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="session-notes">Notes (optional)</Label>
                  <Textarea
                    id="session-notes"
                    placeholder="What do you want to focus on today?"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={2}
                  />
                </div>
              </motion.div>
            )}

            {/* Active session info — shown when running/paused */}
            {(timerState === "running" || timerState === "paused") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card px-8 py-4 flex items-center gap-4 flex-wrap"
              >
                <span className="text-xl">{sessionTypeEmoji(sessionType)}</span>
                <div>
                  <p className="font-semibold text-foreground">{sessionName}</p>
                  {sessionSubject && (
                    <p className="text-sm text-muted-foreground">{sessionSubject}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Streak badge */}
        <StreakBadge streak={streak} />
      </div>

      {/* ── Reflection Dialog ── */}
      <Dialog
        open={timerState === "reflecting"}
        onOpenChange={() => {}}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🌷 Session Reflection</DialogTitle>
            <DialogDescription>
              You studied for <strong>{formatDuration(Math.max(1, Math.round(elapsedSeconds / 60)))}</strong>. Take a moment to reflect.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 pt-1">
            {/* Focus quality */}
            <div className="flex flex-col gap-2">
              <Label>⭐ Focus Quality (1–10)</Label>
              <QualityPicker value={focusQuality} onChange={setFocusQuality} />
            </div>

            {/* What went well */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="went-well">What went well?</Label>
              <Textarea
                id="went-well"
                placeholder="I stayed on task for the first 20 minutes…"
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            {/* Distractions */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="distracted">What distracted you?</Label>
              <Textarea
                id="distracted"
                placeholder="My phone kept buzzing…"
                value={distracted}
                onChange={(e) => setDistracted(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            {/* Reflection notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reflection-notes">Notes (optional)</Label>
              <Textarea
                id="reflection-notes"
                placeholder="Next time I'll silence notifications…"
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => handleSubmitReflection(true)}
                disabled={endSession.isPending}
              >
                Skip
              </Button>
              <Button
                className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => handleSubmitReflection(false)}
                disabled={endSession.isPending}
              >
                {endSession.isPending ? "Saving…" : "Save Session 🌸"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Statistics ── */}
      {stats && (
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-5">📈 Statistics</h2>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            <StatCard
              emoji="⏱️"
              label="Total Focus Hours"
              value={parseFloat((stats.totalMinutes / 60).toFixed(1)) + "h"}
            />
            <StatCard
              emoji="✅"
              label="Sessions Completed"
              value={String(stats.totalSessions)}
            />
            <StatCard
              emoji="📏"
              label="Avg Session Length"
              value={formatDuration(stats.avgLength)}
            />
            <StatCard
              emoji="⭐"
              label="Avg Focus Rating"
              value={stats.avgFocusRating != null ? String(stats.avgFocusRating) + "/10" : "—"}
            />
            <StatCard
              emoji="🏆"
              label="Longest Session"
              value={formatDuration(stats.longestSession)}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Focus hours by day */}
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-primary/5">
              <p className="font-semibold text-foreground mb-4">Focus Hours — Last 14 Days</p>
              {byDayData.every((d) => d.hours === 0) ? (
                <div className="text-center text-muted-foreground py-8 text-sm">No data yet — start your first session! 🌱</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={byDayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e8ec" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v}h`, "Focus"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f6c5d8", fontSize: 12 }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {byDayData.map((_, i) => (
                        <Cell key={i} fill={i === byDayData.length - 1 ? CHART_PINK : CHART_ROSE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Weekly trend */}
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-primary/5">
              <p className="font-semibold text-foreground mb-4">Weekly Focus Trend</p>
              {byWeekData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">Complete sessions across multiple weeks to see a trend. 🌼</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={byWeekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e8ec" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: number) => [`${v}h`, "Focus"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f6c5d8", fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke={CHART_PINK}
                      strokeWidth={2.5}
                      dot={{ fill: CHART_PINK, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Focus by subject */}
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-primary/5 lg:col-span-2">
              <p className="font-semibold text-foreground mb-4">Focus Hours by Subject</p>
              {bySubjectData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">Sessions tagged with a subject will appear here. 📚</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, bySubjectData.length * 36)}>
                  <BarChart
                    data={bySubjectData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e8ec" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="subject" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      formatter={(v: number) => [`${v}h`, "Focus"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f6c5d8", fontSize: 12 }}
                    />
                    <Bar dataKey="hours" radius={[0, 6, 6, 0]} fill={CHART_PINK} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Focus History ── */}
      <section>
        <h2 className="text-2xl font-serif font-semibold text-foreground mb-5">📚 Focus History</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <Input
            placeholder="🔍 Search sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl flex-1"
          />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
          >
            <option value="all">All subjects</option>
            {historySubjects.map((s) => (
              <option key={s} value={s!}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl border border-input bg-background text-sm text-muted-foreground hover:bg-secondary/50 transition-colors whitespace-nowrap"
          >
            {sortOrder === "desc" ? "↓ Newest first" : "↑ Oldest first"}
          </button>
        </div>

        {/* Session cards */}
        {sessions.length === 0 ? (
          <div className="bg-card rounded-3xl p-10 text-center shadow-sm border border-primary/5">
            <span className="text-4xl">🌱</span>
            <p className="text-muted-foreground mt-3 text-sm">
              {debouncedSearch || filterSubject !== "all"
                ? "No sessions match your filters."
                : "No completed sessions yet. Start your first focus session!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={() => handleDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onDelete,
}: {
  session: FocusSession;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 shadow-sm border border-primary/5 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="text-2xl">{sessionTypeEmoji(session.sessionType)}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground truncate">{session.name}</p>
          {session.subject && (
            <span className="text-xs bg-secondary/70 text-muted-foreground px-2 py-0.5 rounded-full">
              {session.subject}
            </span>
          )}
          {session.focusQuality != null && (
            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              ⭐ {session.focusQuality}/10
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{formatSessionDate(session.startedAt)}</span>
          <span>
            {formatSessionTime(session.startedAt)}
            {session.endedAt && ` → ${formatSessionTime(session.endedAt)}`}
          </span>
          {session.durationMinutes != null && (
            <span className="font-medium text-foreground/70">
              {formatDuration(session.durationMinutes)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {confirmDelete ? (
          <>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium px-2"
            >
              Confirm delete
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/50"
            aria-label="Delete session"
          >
            🗑
          </button>
        )}
      </div>
    </motion.div>
  );
}
