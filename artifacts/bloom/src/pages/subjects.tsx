import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSubjects,
  useCreateSubject,
  getListSubjectsQueryKey,
  Subject,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EMOJI_SUGGESTIONS = ["🌿", "📐", "🌍", "🇨🇳", "🌸", "⭐", "🧪", "📖", "🎨", "🎵", "💻", "🏛️", "🔬", "📜", "🌐"];

function masteryColor(pct: number) {
  if (pct >= 90) return { bar: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" };
  if (pct >= 67) return { bar: "bg-sky-400", text: "text-sky-700", bg: "bg-sky-50" };
  if (pct >= 34) return { bar: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" };
  return { bar: "bg-rose-300", text: "text-rose-600", bg: "bg-rose-50" };
}

function SubjectCard({ subject, onClick }: { subject: Subject; onClick: () => void }) {
  const color = masteryColor(subject.masteryPercent);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="w-full text-left bg-card rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-transparent hover:border-secondary hover:shadow-[0_12px_40px_rgb(0,0,0,0.07)] transition-all duration-300 flex flex-col gap-5"
    >
      {/* Emoji + Name */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shrink-0 shadow-sm">
          {subject.emoji}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="font-serif font-semibold text-[1.2rem] text-foreground leading-snug">{subject.name}</h3>
          <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block", color.text, color.bg)}>
            {subject.masteryLabel}
          </span>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[12px] font-medium text-muted-foreground">
          <span>Mastery</span>
          <span className={color.text}>{subject.masteryPercent}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", color.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${subject.masteryPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5 bg-secondary/60 px-3 py-1.5 rounded-xl font-medium">
          <span>📝</span> {subject.notesCount} {subject.notesCount === 1 ? "note" : "notes"}
        </span>
        {subject.upcomingItem ? (
          <span className="flex items-center gap-1.5 bg-secondary/60 px-3 py-1.5 rounded-xl font-medium truncate max-w-[55%]">
            <span>{subject.upcomingItem.type === "exam" ? "🚨" : "✅"}</span>
            <span className="truncate">{subject.upcomingItem.title}</span>
          </span>
        ) : (
          <span className="opacity-40 text-[12px] italic">Nothing due</span>
        )}
      </div>
    </motion.button>
  );
}

function AddSubjectCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="w-full text-left bg-card/60 rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-2 border-dashed border-secondary hover:border-primary/40 hover:bg-card transition-all duration-300 flex flex-col items-center justify-center gap-4 min-h-[200px]"
    >
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-sm">
        ➕
      </div>
      <div className="text-center">
        <p className="font-serif font-semibold text-[1.1rem] text-foreground">Add Subject</p>
        <p className="text-[13px] text-muted-foreground mt-1">Start a new binder</p>
      </div>
    </motion.button>
  );
}

function AddSubjectModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const createSubject = useCreateSubject();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createSubject.mutate(
      { data: { name: name.trim(), emoji } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          onOpenChange(false);
          setName("");
          setEmoji("📚");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif flex items-center gap-2">
            <span>📚</span> New Subject
          </DialogTitle>
          <DialogDescription>Add a subject to your binder collection.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chemistry"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Pick an emoji</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                    emoji === e
                      ? "bg-primary text-primary-foreground shadow-sm scale-110"
                      : "bg-secondary hover:bg-secondary/80 hover:scale-105"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Or type any emoji…"
                className="w-full"
                maxLength={4}
              />
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-3xl shrink-0">
                {emoji}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createSubject.isPending} className="rounded-xl px-8">
              Add Subject
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Subjects() {
  const [, navigate] = useLocation();
  const { data: subjects = [], isLoading } = useListSubjects();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-10">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight font-semibold flex items-center gap-4">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-2xl shadow-sm">
              📚
            </span>
            Subjects
          </h1>
          <p className="text-muted-foreground text-[1.1rem] ml-[4.5rem]">
            Your personal study binders, all in one place.
          </p>
        </header>

        {/* Grid */}
        {isLoading ? (
          <div className="py-24 text-center text-muted-foreground animate-pulse font-medium">
            Loading subjects…
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {subjects.map((subject, i) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <SubjectCard
                    subject={subject}
                    onClick={() => navigate(`/subjects/${subject.id}`)}
                  />
                </motion.div>
              ))}
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: subjects.length * 0.06 }}
              >
                <AddSubjectCard onClick={() => setIsAddOpen(true)} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        <AddSubjectModal open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>
    </AppLayout>
  );
}
