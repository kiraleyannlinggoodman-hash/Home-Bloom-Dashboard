import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, parseISO } from "date-fns";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPlannerItems,
  useCreatePlannerItem,
  useUpdatePlannerItem,
  useDeletePlannerItem,
  getListPlannerItemsQueryKey,
  getGetDashboardSummaryQueryKey,
  PlannerItem,
  PlannerItemType
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --- Configuration ---

const TYPE_CONFIG: Record<PlannerItemType | 'all', { bg: string, text: string, border: string, dot: string, emoji: string, label: string }> = {
  all: { bg: "bg-secondary", text: "text-secondary-foreground", border: "border-secondary", dot: "bg-secondary-foreground", emoji: "✨", label: "All" },
  homework: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-400", emoji: "✅", label: "Homework" },
  exam: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-400", emoji: "🚨", label: "Exam" },
  study_block: { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200", dot: "bg-sky-400", emoji: "📚", label: "Study" },
  event: { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-200", dot: "bg-fuchsia-400", emoji: "📅", label: "Event" },
  note: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-400", emoji: "📝", label: "Note" },
};

export default function Planner() {
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month'>('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<PlannerItemType | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute date ranges to fetch
  const dateRange = useMemo(() => {
    if (viewMode === 'today') {
      return { from: format(currentDate, 'yyyy-MM-dd'), to: format(currentDate, 'yyyy-MM-dd') };
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    } else {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
  }, [viewMode, currentDate]);

  const { data: items = [], isLoading } = useListPlannerItems(dateRange);

  // Derive summary counts for fetched items
  const counts = useMemo(() => ({
    homework: items.filter(i => i.type === 'homework').length,
    exam: items.filter(i => i.type === 'exam').length,
    study_block: items.filter(i => i.type === 'study_block').length,
    event: items.filter(i => i.type === 'event').length,
  }), [items]);

  const visibleItems = useMemo(() => {
    let filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType);
    return filtered.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return -1;
      if (!b.startTime) return 1;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [items, filterType]);

  // Handle navigation
  const prevDate = () => {
    if (viewMode === 'today') setCurrentDate(addDays(currentDate, -1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -30)); // Approximate, sufficient for simple nav
  };

  const nextDate = () => {
    if (viewMode === 'today') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 30));
  };

  const goToToday = () => setCurrentDate(new Date());

  const getHeaderDateLabel = () => {
    if (viewMode === 'today') return format(currentDate, 'EEEE, MMMM do');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'MMM do')} — ${format(end, 'MMM do')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in duration-700 pb-10">
        
        {/* Header & Tabs */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight font-semibold flex items-center gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-2xl shadow-sm">📅</span>
              Planner
            </h1>
            <p className="text-muted-foreground text-[1.1rem] ml-[4.5rem]">
              Organize your days, beautifully.
            </p>
          </div>
          
          <div className="flex bg-card p-1.5 rounded-full border border-transparent shadow-[0_4px_14px_rgb(0,0,0,0.03)] shrink-0 self-start md:self-auto">
            {['today', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-[14px] font-medium transition-all capitalize",
                  viewMode === mode 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-card rounded-[1.5rem] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <button onClick={prevDate} className="w-10 h-10 rounded-full hover:bg-secondary/50 flex items-center justify-center text-xl transition-colors">👈</button>
            <button onClick={goToToday} className="px-4 py-2 rounded-full hover:bg-secondary/50 text-[14px] font-medium transition-colors">Today</button>
            <button onClick={nextDate} className="w-10 h-10 rounded-full hover:bg-secondary/50 flex items-center justify-center text-xl transition-colors">👉</button>
          </div>
          <div className="text-xl md:text-2xl font-serif font-medium px-4">
            {getHeaderDateLabel()}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard type="homework" count={counts.homework} />
          <SummaryCard type="exam" count={counts.exam} />
          <SummaryCard type="study_block" count={counts.study_block} />
          <SummaryCard type="event" count={counts.event} />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
          {(Object.keys(TYPE_CONFIG) as (PlannerItemType | 'all')[]).map((type) => {
            const config = TYPE_CONFIG[type];
            const isActive = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all whitespace-nowrap border border-transparent shrink-0",
                  isActive ? cn(config.bg, config.text, "shadow-sm border-transparent") : "bg-card text-muted-foreground hover:bg-secondary/30 border-border/50"
                )}
              >
                <span>{config.emoji}</span>
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Views */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground animate-pulse font-medium">Loading planner...</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode + currentDate.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {viewMode === 'today' && <TodayView items={visibleItems} />}
                {viewMode === 'week' && <WeekView items={visibleItems} currentDate={currentDate} onDayClick={(d) => { setCurrentDate(d); setViewMode('today'); }} />}
                {viewMode === 'month' && <MonthView items={visibleItems} currentDate={currentDate} onDayClick={(d) => { setCurrentDate(d); setViewMode('today'); }} />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 md:bottom-12 md:right-12 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_4px_20px_rgba(233,168,194,0.6)] flex items-center justify-center text-3xl hover:scale-105 transition-transform z-40 pb-1"
        >
          +
        </button>

        {/* Create Modal */}
        <CreateItemModal open={isModalOpen} onOpenChange={setIsModalOpen} defaultDate={currentDate} />
      </div>
    </AppLayout>
  );
}

// --- Views ---

function TodayView({ items }: { items: PlannerItem[] }) {
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="relative border-l-2 border-secondary ml-4 md:ml-8 space-y-6 pt-4">
      {items.map((item) => (
        <SwipeableItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function WeekView({ items, currentDate, onDayClick }: { items: PlannerItem[], currentDate: Date, onDayClick: (d: Date) => void }) {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {days.map((day, i) => {
        const dayItems = items.filter(item => isSameDay(parseISO(item.date), day));
        const isTodayDay = isToday(day);

        return (
          <div key={i} className="flex flex-col h-full bg-card rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden border border-transparent">
            <button 
              onClick={() => onDayClick(day)}
              className={cn(
                "py-4 px-4 text-center border-b border-secondary/50 hover:bg-secondary/20 transition-colors",
                isTodayDay ? "bg-secondary text-secondary-foreground" : ""
              )}
            >
              <div className="text-[12px] font-bold uppercase tracking-widest opacity-80">{format(day, 'EEE')}</div>
              <div className="text-2xl font-serif font-semibold mt-1">{format(day, 'd')}</div>
            </button>
            <div className="p-3 flex-1 flex flex-col gap-2 min-h-[120px]">
              {dayItems.length > 0 ? (
                dayItems.map(item => {
                  const conf = TYPE_CONFIG[item.type];
                  return (
                    <div key={item.id} className={cn("px-3 py-2 rounded-xl text-[13px] flex items-center gap-2", conf.bg, conf.text, item.completed && "opacity-50 line-through")}>
                      <span>{conf.emoji}</span>
                      <span className="truncate font-medium">{item.title}</span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center opacity-30 text-2xl">🍃</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ items, currentDate, onDayClick }: { items: PlannerItem[], currentDate: Date, onDayClick: (d: Date) => void }) {
  const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-card rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 md:p-8">
      <div className="grid grid-cols-7 mb-4">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[12px] font-bold uppercase tracking-widest text-muted-foreground pb-4">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-6">
        {days.map((day, i) => {
          const dayItems = items.filter(item => isSameDay(parseISO(item.date), day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDay = isToday(day);

          return (
            <button 
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex flex-col items-center gap-2 group hover:scale-110 transition-transform relative p-2 rounded-2xl",
                !isCurrentMonth && "opacity-30"
              )}
            >
              <span className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full text-lg font-medium transition-colors",
                isTodayDay ? "bg-primary text-primary-foreground shadow-md" : "group-hover:bg-secondary group-hover:text-secondary-foreground text-foreground"
              )}>
                {format(day, 'd')}
              </span>
              
              <div className="flex gap-1 justify-center h-2">
                {dayItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={cn("w-1.5 h-1.5 rounded-full", TYPE_CONFIG[item.type].dot)} />
                ))}
                {dayItems.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center text-muted-foreground flex flex-col items-center bg-card rounded-[1.5rem] border border-transparent shadow-sm">
      <span className="text-6xl mb-6 opacity-80">🍃</span>
      <h3 className="text-2xl font-serif font-medium text-foreground mb-2">A beautifully empty view</h3>
      <p className="text-[15px]">Nothing scheduled here yet. Take a breath, or add something new.</p>
    </div>
  );
}

// --- Components ---

function SummaryCard({ type, count }: { type: PlannerItemType, count: number }) {
  const config = TYPE_CONFIG[type];
  return (
    <div className={cn("rounded-[1.5rem] p-5 border border-transparent flex flex-col items-center justify-center gap-2 shadow-sm transition-transform hover:scale-105", config.bg, config.text)}>
      <span className="text-3xl mb-1">{config.emoji}</span>
      <span className="text-3xl font-serif font-semibold">{count}</span>
      <span className="text-[12px] font-bold uppercase tracking-widest opacity-80">{config.label}</span>
    </div>
  );
}

function SwipeableItem({ item }: { item: PlannerItem }) {
  const queryClient = useQueryClient();
  const updateItem = useUpdatePlannerItem();
  const deleteItem = useDeletePlannerItem();

  const [isDeleting, setIsDeleting] = useState(false);
  // isDragging gates the hint overlay — only visible during an active drag
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();
  // isBusy prevents double-fires while an animation/mutation is in progress
  const isBusy = React.useRef(false);

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListPlannerItemsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  }, [queryClient]);

  const handleToggle = React.useCallback(() => {
    updateItem.mutate(
      { id: item.id, data: { completed: !item.completed } },
      { onSuccess: invalidate }
    );
  }, [item.id, item.completed, updateItem, invalidate]);

  const handleDelete = React.useCallback(() => {
    setIsDeleting(true);
    deleteItem.mutate({ id: item.id }, { onSuccess: invalidate });
  }, [item.id, deleteItem, invalidate]);

  const resetPosition = React.useCallback(() => {
    controls.start({
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 40 },
    });
  }, [controls]);

  const handleDragStart = React.useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = React.useCallback(
    async (_e: PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
      // Guard against re-entry
      if (isBusy.current) {
        setIsDragging(false);
        resetPosition();
        return;
      }

      const { offset, velocity } = info;

      try {
        isBusy.current = true;

        if (offset.x > 100 || velocity.x > 500) {
          // Swipe right → complete
          await controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } });
          handleToggle();
        } else if (offset.x < -100 || velocity.x < -500) {
          // Swipe left → delete
          await controls.start({ x: -500, opacity: 0, transition: { duration: 0.25, ease: "easeIn" } });
          handleDelete();
          return; // component unmounts; skip finally reset
        } else {
          // Not past threshold → snap back
          resetPosition();
        }
      } catch {
        resetPosition();
      } finally {
        isBusy.current = false;
        setIsDragging(false);
      }
    },
    [controls, handleToggle, handleDelete, resetPosition]
  );

  // Safety net: if pointer is lost mid-drag (e.g. touch cancel on mobile),
  // framer-motion fires onDragEnd in most cases, but we also reset on pointer up
  // at the window level to catch any edge cases.
  React.useEffect(() => {
    if (!isDragging) return;
    const cleanup = () => {
      // Give framer-motion's own onDragEnd a tick to fire first
      setTimeout(() => {
        if (!isBusy.current) {
          setIsDragging(false);
          resetPosition();
        }
      }, 100);
    };
    window.addEventListener("pointerup", cleanup, { once: true });
    window.addEventListener("pointercancel", cleanup, { once: true });
    return () => {
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };
  }, [isDragging, resetPosition]);

  if (isDeleting) return null;

  const conf = TYPE_CONFIG[item.type];
  const priorityColor =
    item.priority === "high" ? "text-rose-500" :
    item.priority === "medium" ? "text-amber-500" :
    "text-emerald-500";

  return (
    <div className="relative pl-6 md:pl-10">
      {/* Timeline dot */}
      <div className={cn("absolute -left-[11px] top-5 w-5 h-5 rounded-full border-[5px] border-background z-10", conf.dot)} />

      {/* Swipe container */}
      <div className="relative rounded-[1.5rem] overflow-hidden group">
        {/* Hint overlay — ONLY rendered while dragging to prevent stuck visibility */}
        {isDragging && (
          <div className="absolute inset-0 flex justify-between items-center px-6 pointer-events-none">
            <div className="text-emerald-600 flex items-center gap-2 font-bold text-[14px]">
              <span>✅</span> Complete
            </div>
            <div className="text-rose-600 flex items-center gap-2 font-bold text-[14px]">
              <span>🗑️</span> Delete
            </div>
          </div>
        )}

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          animate={controls}
          className={cn(
            "relative bg-card rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-transparent flex flex-col md:flex-row md:items-center gap-4 z-10 cursor-grab active:cursor-grabbing",
            item.completed && "opacity-60 bg-secondary/20"
          )}
        >
          {/* Desktop hover actions */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex gap-2 bg-card/80 backdrop-blur-sm p-1 rounded-full shadow-sm border border-border/50">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggle(); }}
              className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:scale-110 transition-transform"
            >✅</button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:scale-110 transition-transform"
            >🗑️</button>
          </div>

          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0", conf.bg, conf.text)}>
            {conf.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h4 className={cn("font-medium text-[16px] truncate", item.completed && "line-through")}>
                {item.title}
              </h4>
              <div
                className={cn("text-[10px] w-2 h-2 rounded-full shrink-0", priorityColor)}
                title={`Priority: ${item.priority}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-muted-foreground">
              {item.startTime && (
                <span className="flex items-center gap-1.5 text-primary">
                  <span>⏱️</span> {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}
                </span>
              )}
              {item.subject && (
                <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-0.5 rounded-md">
                  <span>🏷️</span> {item.subject}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CreateItemModal({ open, onOpenChange, defaultDate }: { open: boolean, onOpenChange: (open: boolean) => void, defaultDate: Date }) {
  const queryClient = useQueryClient();
  const createItem = useCreatePlannerItem();
  
  const [type, setType] = useState<PlannerItemType>('homework');
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    createItem.mutate(
      { 
        data: { 
          title, 
          type, 
          date, 
          subject: subject || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          priority 
        } 
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlannerItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          onOpenChange(false);
          // Reset form
          setTitle("");
          setSubject("");
          setStartTime("");
          setEndTime("");
          setPriority("medium");
          setType("homework");
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-serif">
            <span>✨</span> Add to Planner
          </DialogTitle>
          <DialogDescription>Schedule something new.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PlannerItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">✅ Homework</SelectItem>
                  <SelectItem value="exam">🚨 Exam</SelectItem>
                  <SelectItem value="study_block">📚 Study</SelectItem>
                  <SelectItem value="event">📅 Event</SelectItem>
                  <SelectItem value="note">📝 Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need to do?" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. History" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time (Optional)</Label>
              <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time (Optional)</Label>
              <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={!title || createItem.isPending} className="w-full sm:w-auto rounded-xl px-8">
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}