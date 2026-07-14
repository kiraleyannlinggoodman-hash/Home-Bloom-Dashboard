import { format } from "date-fns"
import { motion } from "framer-motion"
import { 
  Sun, Moon, CloudSun, 
  CheckCircle2, Circle, Clock, Target, ListTodo, Trophy,
  Quote as QuoteIcon, Sparkles, BookMarked
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { QuickActions } from "@/components/quick-actions"
import { AppLayout } from "@/components/layout"

import {
  useGetDashboardSummary,
  useListTasks,
  useListScheduleEvents,
  useGetDailyQuote,
  useUpdateTask,
  getGetDashboardSummaryQueryKey,
  getListTasksQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd")
  const hour = new Date().getHours()

  // Queries
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary()
  const { data: tasks, isLoading: isLoadingTasks } = useListTasks({ dueToday: true })
  const { data: schedule, isLoading: isLoadingSchedule } = useListScheduleEvents({ date: today })
  const { data: quote } = useGetDailyQuote()

  // Mutations
  const queryClient = useQueryClient()
  const updateTask = useUpdateTask()

  const toggleTask = (id: number, currentCompleted: boolean) => {
    updateTask.mutate(
      { id, data: { completed: !currentCompleted } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ dueToday: true }) })
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() })
        }
      }
    )
  }

  // Greeting logic
  let greeting = "Hello"
  let GreetingIcon = Sun
  let greetingSubtitle = "Let's bloom today."
  
  if (hour < 12) {
    greeting = "Good morning"
    GreetingIcon = CloudSun
    greetingSubtitle = "Let's bloom today."
  } else if (hour < 18) {
    greeting = "Good afternoon"
    GreetingIcon = Sun
    greetingSubtitle = "Keep up the great work."
  } else {
    greeting = "Good evening"
    GreetingIcon = Moon
    greetingSubtitle = "Finish strong, then get some rest."
  }

  const name = summary?.greetingName || "Kira"

  const formatMinutes = (mins: number) => {
    if (!mins) return "0m"
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <AppLayout>
      <div className="space-y-8 md:space-y-10 animate-in fade-in duration-700 pb-10">
        
        {/* Header Section */}
        <header className="flex items-end justify-between">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="p-2.5 rounded-2xl bg-secondary text-primary">
                <GreetingIcon className="w-6 h-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif text-foreground tracking-tight">
                {greeting}, {name}
              </h1>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground text-lg ml-14"
            >
              {greetingSubtitle}
            </motion.p>
          </div>
        </header>

        {/* Hero & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main Focus Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 bg-primary text-primary-foreground p-6 md:p-8 rounded-[2rem] shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <span className="font-medium text-primary-foreground/80 flex items-center gap-2">
                <Target className="w-5 h-5" /> Today's Focus
              </span>
              <div className="mt-8 mb-2">
                <div className="text-5xl md:text-6xl font-serif tracking-tight">
                  {isLoadingSummary ? "—" : formatMinutes(summary?.studyMinutesToday || 0)}
                </div>
                <div className="text-primary-foreground/80 mt-2 text-lg">studied today</div>
              </div>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <StatCard 
              icon={<ListTodo className="w-5 h-5" />} 
              label="Tasks Due" 
              value={isLoadingSummary ? "—" : summary?.tasksDueToday} 
              delay={0.15}
            />
            <StatCard 
              icon={<Trophy className="w-5 h-5" />} 
              label="Day Streak" 
              value={isLoadingSummary ? "—" : summary?.focusStreakDays} 
              delay={0.2}
            />
            <StatCard 
              icon={<BookMarked className="w-5 h-5" />} 
              label="Exams" 
              value={isLoadingSummary ? "—" : summary?.upcomingExamsCount} 
              delay={0.25}
              className="col-span-2"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
          </div>
          <QuickActions />
        </section>

        {/* Main Content Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Schedule & Tasks */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Today's Schedule */}
            <section className="bg-card border border-card-border rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-secondary rounded-xl text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif tracking-tight">Today's Schedule</h2>
              </div>
              
              <div className="space-y-4">
                {isLoadingSchedule ? (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">Loading schedule...</div>
                ) : schedule && schedule.length > 0 ? (
                  <div className="relative border-l-2 border-muted ml-4 space-y-6">
                    {schedule.map((event, i) => (
                      <div key={event.id} className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-card bg-primary" />
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                          <span className="font-mono text-sm text-primary font-medium">{event.time}</span>
                          <span className="font-medium text-card-foreground">{event.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wider font-semibold ml-auto sm:ml-0">
                            {event.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                    <Clock className="w-8 h-8 opacity-20 mb-3" />
                    <p>Nothing scheduled yet. A clear day ahead.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Today's Tasks */}
            <section className="bg-card border border-card-border rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-secondary rounded-xl text-primary">
                  <ListTodo className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif tracking-tight">Due Today</h2>
              </div>
              
              <div className="space-y-2">
                {isLoadingTasks ? (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">Loading tasks...</div>
                ) : tasks && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-start gap-4 p-4 rounded-2xl transition-all ${task.completed ? 'bg-secondary/30 opacity-60' : 'bg-secondary hover:bg-secondary/80'}`}
                    >
                      <button 
                        onClick={() => toggleTask(task.id, task.completed)}
                        className="mt-0.5 text-primary hover:text-primary/80 transition-colors shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                          {task.title}
                        </p>
                        {task.subject && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.subject}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 opacity-20 mb-3" />
                    <p>All caught up. Good work.</p>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Right Column: Progress & Quote */}
          <div className="space-y-8">
            
            {/* Bloom Progress */}
            <motion.section 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-card-border rounded-[2rem] p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent rounded-xl text-accent-foreground">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif tracking-tight">Growth</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-medium text-foreground">
                    {isLoadingSummary ? "..." : summary?.bloomProgressLabel}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {isLoadingSummary ? "0%" : `${summary?.bloomProgressPercent}%`}
                  </span>
                </div>
                <Progress 
                  value={summary?.bloomProgressPercent || 0} 
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground pt-2">
                  Studying is rewarded with better studying. Keep going.
                </p>
              </div>
            </motion.section>

            {/* Daily Quote */}
            <motion.section 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-accent text-accent-foreground rounded-[2rem] p-8 shadow-sm flex flex-col justify-center min-h-[240px]"
            >
              <QuoteIcon className="w-8 h-8 opacity-20 mb-4" />
              {quote ? (
                <>
                  <p className="font-serif text-2xl leading-snug mb-6">"{quote.text}"</p>
                  {quote.author && (
                    <p className="text-sm font-medium tracking-wide uppercase opacity-80 mt-auto">
                      — {quote.author}
                    </p>
                  )}
                </>
              ) : (
                <div className="animate-pulse flex flex-col gap-2">
                  <div className="h-4 bg-accent-foreground/10 rounded w-3/4"></div>
                  <div className="h-4 bg-accent-foreground/10 rounded w-1/2"></div>
                </div>
              )}
            </motion.section>

          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ icon, label, value, delay, className = "" }: { icon: React.ReactNode, label: string, value: React.ReactNode, delay: number, className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-card border border-card-border p-6 rounded-[2rem] flex flex-col justify-between min-h-[140px] shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
        {icon} {label}
      </div>
      <div className="text-4xl md:text-5xl font-serif tracking-tight mt-4 text-foreground">
        {value}
      </div>
    </motion.div>
  )
}
