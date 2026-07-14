import { useState, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, BookOpen, Calendar as CalendarIcon, Clock, PenLine, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  useCreateTask,
  useCreateStudySession,
  useCreateScheduleEvent,
  getGetDashboardSummaryQueryKey,
  getListTasksQueryKey,
  getListScheduleEventsQueryKey,
} from "@workspace/api-client-react"

export function QuickActions() {
  const [openModal, setOpenModal] = useState<"homework" | "study" | "event" | "note" | null>(null)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ActionCard 
        icon={<BookOpen className="w-5 h-5" />} 
        title="Homework" 
        onClick={() => setOpenModal("homework")}
        delay={0.1}
      />
      <ActionCard 
        icon={<Clock className="w-5 h-5" />} 
        title="Study Session" 
        onClick={() => setOpenModal("study")}
        delay={0.15}
      />
      <ActionCard 
        icon={<CalendarIcon className="w-5 h-5" />} 
        title="Event" 
        onClick={() => setOpenModal("event")}
        delay={0.2}
      />
      <ActionCard 
        icon={<PenLine className="w-5 h-5" />} 
        title="Note" 
        onClick={() => setOpenModal("note")}
        delay={0.25}
      />

      <HomeworkModal open={openModal === "homework"} onOpenChange={(o) => !o && setOpenModal(null)} />
      <StudyModal open={openModal === "study"} onOpenChange={(o) => !o && setOpenModal(null)} />
      <EventModal open={openModal === "event"} onOpenChange={(o) => !o && setOpenModal(null)} />
      <NoteModal open={openModal === "note"} onOpenChange={(o) => !o && setOpenModal(null)} />
    </div>
  )
}

function ActionCard({ icon, title, onClick, delay }: { icon: React.ReactNode, title: string, onClick: () => void, delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-card rounded-[1.5rem] border border-card-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-card-foreground group"
    >
      <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-primary mb-3 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
        {icon}
      </div>
      <span className="text-sm font-medium">{title}</span>
    </motion.button>
  )
}

// Modals
function HomeworkModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const createTask = useCreateTask()
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    createTask.mutate(
      { data: { title, subject, type: "homework", dueDate: dueDate || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ dueToday: true }) })
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() })
          onOpenChange(false)
          setTitle("")
          setSubject("")
          setDueDate("")
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Homework</DialogTitle>
          <DialogDescription>Add an upcoming assignment or task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="hw-title">Task Title</Label>
            <Input id="hw-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Read chapter 4" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-subject">Subject (Optional)</Label>
            <Input id="hw-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Biology" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hw-due">Due Date</Label>
            <Input id="hw-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={!title || createTask.isPending}>
              Add Homework
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StudyModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const createStudy = useCreateStudySession()
  const [subject, setSubject] = useState("")
  const [duration, setDuration] = useState("30")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mins = parseInt(duration, 10)
    if (isNaN(mins) || mins <= 0) return

    createStudy.mutate(
      { data: { subject: subject || undefined, durationMinutes: mins } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() })
          onOpenChange(false)
          setSubject("")
          setDuration("30")
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Study Session</DialogTitle>
          <DialogDescription>Record focused study time.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="st-subject">Subject (Optional)</Label>
            <Input id="st-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Calculus" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-dur">Duration (minutes)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="st-dur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="25">25 minutes (Pomodoro)</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={createStudy.isPending}>
              Log Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EventModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const createEvent = useCreateScheduleEvent()
  const [title, setTitle] = useState("")
  const [time, setTime] = useState("12:00")
  
  const today = format(new Date(), 'yyyy-MM-dd')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !time) return

    createEvent.mutate(
      { data: { title, time, type: "event", date: today } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListScheduleEventsQueryKey({ date: today }) })
          onOpenChange(false)
          setTitle("")
          setTime("12:00")
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Event Today</DialogTitle>
          <DialogDescription>Schedule an event for today.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Event Title</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Study Group" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-time">Time</Label>
            <Input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={!title || !time || createEvent.isPending}>
              Add to Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function NoteModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const createTask = useCreateTask()
  const [title, setTitle] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    createTask.mutate(
      { data: { title, type: "note" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ dueToday: true }) })
          onOpenChange(false)
          setTitle("")
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
          <DialogDescription>Jot down a quick thought or reminder.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nt-title">Note</Label>
            <Input id="nt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Buy more pens" autoFocus />
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={!title || createTask.isPending}>
              Save Note
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
