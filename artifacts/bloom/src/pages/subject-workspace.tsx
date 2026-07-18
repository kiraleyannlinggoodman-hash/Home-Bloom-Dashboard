import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSubject,
  useUpdateSubject,
  useDeleteSubject,
  useGetSubjectSummary,
  useListSubjectNotes,
  useCreateSubjectNote,
  useUpdateSubjectNote,
  useDeleteSubjectNote,
  useListSubjectFiles,
  useCreateSubjectFile,
  useDeleteSubjectFile,
  useRequestUploadUrl,
  useListPlannerItems,
  getListSubjectsQueryKey,
  getGetSubjectQueryKey,
  getListSubjectNotesQueryKey,
  getListSubjectFilesQueryKey,
  getGetSubjectSummaryQueryKey,
  SubjectNote,
  SubjectFile,
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
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────

type Tab = "notes" | "files" | "mastery" | "planner" | "progress" | "studying" | "activity";

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: "notes",    emoji: "📚", label: "Notes"            },
  { id: "files",    emoji: "📄", label: "Files"            },
  { id: "mastery",  emoji: "🎯", label: "Mastery"          },
  { id: "planner",  emoji: "📅", label: "Planner"          },
  { id: "progress", emoji: "📊", label: "Progress"         },
  { id: "studying", emoji: "🔥", label: "Continue"         },
  { id: "activity", emoji: "🩷", label: "Recent"           },
];

const TYPE_EMOJI: Record<string, string> = {
  homework:    "✅",
  exam:        "🚨",
  study_block: "📚",
  event:       "📅",
  note:        "📝",
};

function masteryColor(pct: number) {
  if (pct >= 90) return { bar: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (pct >= 67) return { bar: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50"     };
  if (pct >= 34) return { bar: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   };
  return           { bar: "bg-rose-300",          text: "text-rose-600",    bg: "bg-rose-50"    };
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ── Notes Tab ────────────────────────────────────────────────────────

function NotesTab({ subjectId }: { subjectId: number }) {
  const queryClient = useQueryClient();
  const { data: notes = [] } = useListSubjectNotes(subjectId);
  const createNote = useCreateSubjectNote();
  const updateNote = useUpdateSubjectNote();
  const deleteNote = useDeleteSubjectNote();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListSubjectNotesQueryKey(subjectId) });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createNote.mutate(
      { id: subjectId, data: { title: newTitle.trim(), content: newContent } },
      {
        onSuccess: () => {
          invalidate();
          setIsAdding(false);
          setNewTitle("");
          setNewContent("");
        },
      }
    );
  };

  const startEdit = (note: SubjectNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    updateNote.mutate(
      { id: subjectId, noteId: editingId, data: { title: editTitle.trim(), content: editContent } },
      {
        onSuccess: () => {
          invalidate();
          setEditingId(null);
        },
      }
    );
  };

  const handleDelete = (noteId: number) => {
    deleteNote.mutate(
      { id: subjectId, noteId },
      { onSuccess: invalidate }
    );
  };

  return (
    <div className="space-y-5">
      {/* Add note form */}
      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary/40 rounded-[1.5rem] p-6 space-y-4 overflow-hidden"
          >
            <Input
              placeholder="Note title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="text-base font-medium"
            />
            <Textarea
              placeholder="Start writing…"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newTitle.trim() || createNote.isPending}
                className="rounded-xl px-6"
              >
                Save Note
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => setIsAdding(true)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-secondary/40 hover:bg-secondary/60 rounded-[1.5rem] px-6 py-4 flex items-center gap-3 text-muted-foreground font-medium transition-colors text-left border-2 border-dashed border-secondary hover:border-primary/30"
          >
            <span className="text-xl">📝</span> Write a new note…
          </motion.button>
        )}
      </AnimatePresence>

      {/* Notes list */}
      {notes.length === 0 && !isAdding ? (
        <div className="py-16 text-center text-muted-foreground">
          <span className="text-5xl mb-4 block">📭</span>
          <p className="font-medium">No notes yet. Start by writing one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              layout
              className="bg-card rounded-[1.5rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent group"
            >
              {editingId === note.id ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-base font-medium"
                    autoFocus
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex gap-3 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit} disabled={updateNote.isPending} className="rounded-xl px-5">
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="font-semibold text-[1rem] text-foreground">{note.title}</h4>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(note)}
                        className="w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center text-sm hover:scale-110 transition-transform"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-sm hover:scale-110 transition-transform"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {note.content && (
                    <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  )}
                  <p className="text-[12px] text-muted-foreground/60 mt-3">
                    Updated {format(parseISO(note.updatedAt), "MMM d, yyyy")}
                  </p>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Files Tab ────────────────────────────────────────────────────────

function FilesTab({ subjectId }: { subjectId: number }) {
  const queryClient = useQueryClient();
  const { data: files = [] } = useListSubjectFiles(subjectId);
  const createFile = useCreateSubjectFile();
  const deleteFile = useDeleteSubjectFile();
  const requestUrl = useRequestUploadUrl();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListSubjectFilesQueryKey(subjectId) });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    try {
      // 1. Get presigned URL
      const { uploadURL, objectPath } = await new Promise<{ uploadURL: string; objectPath: string }>(
        (resolve, reject) => {
          requestUrl.mutate(
            { data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" } },
            { onSuccess: resolve, onError: reject }
          );
        }
      );

      // 2. PUT file directly to GCS
      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putResp.ok) throw new Error(`Upload failed: ${putResp.status}`);

      // 3. Record metadata
      await new Promise<void>((resolve, reject) => {
        createFile.mutate(
          {
            id: subjectId,
            data: {
              fileName: file.name,
              objectPath,
              contentType: file.type || "application/octet-stream",
              sizeBytes: file.size,
            },
          },
          { onSuccess: () => { invalidate(); resolve(); }, onError: reject }
        );
      });
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (fileId: number) => {
    deleteFile.mutate({ id: subjectId, fileId }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full border-2 border-dashed rounded-[1.5rem] p-10 flex flex-col items-center gap-3 transition-all",
            uploading
              ? "border-primary/30 bg-primary/5 opacity-70 cursor-wait"
              : "border-secondary hover:border-primary/40 hover:bg-secondary/30 cursor-pointer"
          )}
        >
          <span className="text-4xl">{uploading ? "⏳" : "📤"}</span>
          <p className="font-medium text-muted-foreground">
            {uploading ? "Uploading…" : "Click to upload a file"}
          </p>
          <p className="text-[13px] text-muted-foreground/60">PDFs, images, documents, and more</p>
        </button>
        {uploadError && (
          <p className="text-rose-500 text-[13px] mt-2 text-center">{uploadError}</p>
        )}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <span className="text-5xl mb-4 block">📂</span>
          <p className="font-medium">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(files as SubjectFile[]).map((file) => (
            <motion.div
              key={file.id}
              layout
              className="bg-card rounded-[1.5rem] p-5 flex items-center gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent group"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
                {file.contentType.startsWith("image/") ? "🖼️"
                  : file.contentType === "application/pdf" ? "📕"
                  : file.contentType.includes("word") ? "📝"
                  : "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] truncate">{file.fileName}</p>
                <p className="text-[12px] text-muted-foreground">
                  {formatBytes(file.sizeBytes)} · {format(parseISO(file.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(file.id)}
                className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:scale-110 transition-all text-sm shrink-0"
                title="Remove"
              >
                🗑️
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mastery Tab ───────────────────────────────────────────────────────

function MasteryTab({ subjectId }: { subjectId: number }) {
  const queryClient = useQueryClient();
  const { data: subject } = useGetSubject(subjectId);
  const updateSubject = useUpdateSubject();
  const [localPct, setLocalPct] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const currentPct = localPct ?? subject?.masteryPercent ?? 0;
  const color = masteryColor(currentPct);

  const MILESTONES = [
    { pct: 0,   label: "Just Started", emoji: "🌱" },
    { pct: 34,  label: "Growing",      emoji: "🌿" },
    { pct: 67,  label: "Confident",    emoji: "🌸" },
    { pct: 90,  label: "Mastered",     emoji: "⭐" },
  ];

  const handleSave = () => {
    updateSubject.mutate(
      { id: subjectId, data: { masteryPercent: currentPct } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId) });
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          setLocalPct(null);
        },
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Big percent display */}
      <div className="bg-card rounded-[1.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-center space-y-6">
        <div className="space-y-1">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Current mastery</p>
          <div className="flex items-end justify-center gap-2">
            <span className="text-7xl font-serif font-bold text-foreground leading-none">{currentPct}</span>
            <span className="text-2xl text-muted-foreground mb-2">%</span>
          </div>
          <span className={cn("inline-flex items-center gap-2 text-[14px] font-semibold px-4 py-1.5 rounded-full", color.text, color.bg)}>
            {MILESTONES.slice().reverse().find((m) => currentPct >= m.pct)?.emoji}{" "}
            {MILESTONES.slice().reverse().find((m) => currentPct >= m.pct)?.label}
          </span>
        </div>

        {/* Slider */}
        <div className="px-4">
          <Slider
            min={0}
            max={100}
            step={1}
            value={[currentPct]}
            onValueChange={([v]) => setLocalPct(v)}
            className="w-full"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={updateSubject.isPending || localPct === null}
          className="rounded-xl px-8"
        >
          {saved ? "✅ Saved!" : "Save Mastery"}
        </Button>
      </div>

      {/* Milestones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {MILESTONES.map((m) => (
          <div
            key={m.pct}
            className={cn(
              "rounded-[1.5rem] p-5 text-center transition-all border border-transparent",
              currentPct >= m.pct ? "bg-card shadow-[0_4px_20px_rgb(0,0,0,0.04)]" : "bg-secondary/30 opacity-60"
            )}
          >
            <span className="text-3xl block mb-2">{m.emoji}</span>
            <p className="font-semibold text-[14px]">{m.label}</p>
            <p className="text-[12px] text-muted-foreground">{m.pct}%+</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Planner Tab ───────────────────────────────────────────────────────

function PlannerTab({ subjectName }: { subjectName: string }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: items = [] } = useListPlannerItems({
    from: today,
    to: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  const subjectItems = items
    .filter((i) => i.subject === subjectName)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (subjectItems.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <span className="text-5xl mb-4 block">🗓️</span>
        <p className="font-medium">No upcoming items for this subject in the next 30 days.</p>
        <p className="text-[13px] mt-1">Add some in the Planner to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subjectItems.map((item) => {
        const emoji = TYPE_EMOJI[item.type] ?? "📌";
        return (
          <div
            key={item.id}
            className={cn(
              "bg-card rounded-[1.5rem] p-5 flex items-center gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent",
              item.completed && "opacity-50"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl shrink-0">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium text-[15px]", item.completed && "line-through")}>{item.title}</p>
              <p className="text-[13px] text-muted-foreground">
                {format(parseISO(item.date), "EEEE, MMM d")}
                {item.startTime ? ` · ${item.startTime}` : ""}
              </p>
            </div>
            {item.completed && (
              <span className="text-emerald-500 text-sm font-medium shrink-0">Done ✅</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Tab ──────────────────────────────────────────────────────

function ProgressTab({ subjectId }: { subjectId: number }) {
  const { data: summary, isLoading } = useGetSubjectSummary(subjectId);

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground animate-pulse">Loading progress…</div>;
  }
  if (!summary) return null;

  const completionPct = summary.tasksTotal > 0
    ? Math.round((summary.tasksCompleted / summary.tasksTotal) * 100)
    : 0;

  const STATS = [
    { emoji: "⏱️", label: "Study Time",         value: `${summary.studyMinutesTotal} min`  },
    { emoji: "✅", label: "Tasks Completed",     value: `${summary.tasksCompleted} / ${summary.tasksTotal}` },
    { emoji: "📈", label: "Homework Completion", value: `${completionPct}%`                },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card rounded-[1.5rem] p-6 text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent">
            <span className="text-4xl block mb-3">{s.emoji}</span>
            <p className="text-2xl font-serif font-bold text-foreground">{s.value}</p>
            <p className="text-[13px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Continue Studying Tab ─────────────────────────────────────────────

function ContinueStudyingTab({ subject }: { subject: { emoji: string; name: string; masteryPercent: number; masteryLabel: string } }) {
  const tips = [
    { emoji: "🃏", title: "Flashcard Review",    desc: "Quiz yourself on key terms and definitions." },
    { emoji: "📝", title: "Summarise your notes", desc: "Rewrite your notes from memory to reinforce them." },
    { emoji: "🎙️", title: "Teach it back",        desc: "Explain the concept out loud as if teaching a friend." },
    { emoji: "🧩", title: "Practice Problems",    desc: "Apply what you know with exercises and past papers." },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-secondary/40 rounded-[1.5rem] p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center text-4xl shadow-sm shrink-0">
          {subject.emoji}
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Continue with</p>
          <h3 className="text-2xl font-serif font-semibold text-foreground">{subject.name}</h3>
          <span className="text-[13px] text-muted-foreground">
            {subject.masteryLabel} · {subject.masteryPercent}% mastery
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tips.map((tip) => (
          <div
            key={tip.title}
            className="bg-card rounded-[1.5rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent hover:border-secondary hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all cursor-default"
          >
            <span className="text-3xl block mb-3">{tip.emoji}</span>
            <h4 className="font-semibold text-[15px] mb-1">{tip.title}</h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Activity Tab ───────────────────────────────────────────────

function ActivityTab({ subjectId }: { subjectId: number }) {
  const { data: summary, isLoading } = useGetSubjectSummary(subjectId);

  if (isLoading) {
    return <div className="py-16 text-center text-muted-foreground animate-pulse">Loading activity…</div>;
  }

  const activity = summary?.recentActivity ?? [];

  if (activity.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <span className="text-5xl mb-4 block">🩷</span>
        <p className="font-medium">No recent activity yet.</p>
        <p className="text-[13px] mt-1">Start adding notes, files, or studying to see it here.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-secondary ml-4 space-y-6 pt-2">
      {activity.map((item, i) => (
        <div key={i} className="relative pl-8">
          <div className="absolute -left-[11px] top-3 w-5 h-5 rounded-full bg-secondary border-4 border-background z-10 flex items-center justify-center text-[10px]">
            {item.emoji}
          </div>
          <div className="bg-card rounded-[1.25rem] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent">
            <p className="font-medium text-[14px] text-foreground">{item.title}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {format(parseISO(item.timestamp), "MMM d, yyyy · h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────

function DeleteSubjectModal({
  open,
  subjectName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  subjectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Delete subject?</DialogTitle>
          <DialogDescription>
            This will permanently remove <strong>{subjectName}</strong> and all its notes and files. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onCancel}>Keep it</Button>
          <Button variant="destructive" onClick={onConfirm} className="rounded-xl px-6">
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Workspace Page ───────────────────────────────────────────────

export default function SubjectWorkspace({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: subject, isLoading } = useGetSubject(id);
  const deleteSubject = useDeleteSubject();
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-muted-foreground animate-pulse font-medium">
          Loading subject…
        </div>
      </AppLayout>
    );
  }

  if (!subject) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-muted-foreground">
          <span className="text-5xl mb-4 block">🔍</span>
          <p className="font-medium">Subject not found.</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/subjects")}>
            Back to Subjects
          </Button>
        </div>
      </AppLayout>
    );
  }

  const color = masteryColor(subject.masteryPercent);

  const handleDeleteConfirm = () => {
    deleteSubject.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          navigate("/subjects");
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-10">
        {/* Back button */}
        <button
          onClick={() => navigate("/subjects")}
          className="flex items-center gap-2 text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Subjects
        </button>

        {/* Subject header */}
        <header className="bg-card rounded-[1.5rem] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center text-5xl shadow-sm shrink-0">
            {subject.emoji}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">{subject.name}</h1>
              <span className={cn("text-[13px] font-semibold px-3 py-1 rounded-full inline-block mt-2", color.text, color.bg)}>
                {subject.masteryLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden max-w-xs">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", color.bar)}
                  style={{ width: `${subject.masteryPercent}%` }}
                />
              </div>
              <span className={cn("text-[13px] font-semibold", color.text)}>{subject.masteryPercent}%</span>
            </div>
            <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
              <span>📝 {subject.notesCount} notes</span>
              <span>📄 {subject.filesCount} files</span>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="self-start opacity-40 hover:opacity-100 hover:text-rose-500 transition-all text-[13px] flex items-center gap-1.5 font-medium"
            title="Delete subject"
          >
            🗑️ Delete
          </button>
        </header>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-2 px-2 pb-1">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(233,168,194,0.3)]"
                    : "bg-card text-muted-foreground hover:bg-secondary/50 shadow-sm"
                )}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "notes"    && <NotesTab subjectId={id} />}
            {activeTab === "files"    && <FilesTab subjectId={id} />}
            {activeTab === "mastery"  && <MasteryTab subjectId={id} />}
            {activeTab === "planner"  && <PlannerTab subjectName={subject.name} />}
            {activeTab === "progress" && <ProgressTab subjectId={id} />}
            {activeTab === "studying" && (
              <ContinueStudyingTab
                subject={{
                  emoji: subject.emoji,
                  name: subject.name,
                  masteryPercent: subject.masteryPercent,
                  masteryLabel: subject.masteryLabel,
                }}
              />
            )}
            {activeTab === "activity" && <ActivityTab subjectId={id} />}
          </motion.div>
        </AnimatePresence>

        <DeleteSubjectModal
          open={showDeleteModal}
          subjectName={subject.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      </div>
    </AppLayout>
  );
}
