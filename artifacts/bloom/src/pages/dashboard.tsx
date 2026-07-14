import { format } from "date-fns"
import { motion } from "framer-motion"

import { Progress } from "@/components/ui/progress"
import { QuickActions } from "@/components/quick-actions"
import { AppLayout } from "@/components/layout"

import {
  useGetDashboardSummary,
  useListPlannerItems,
  useGetDailyQuote,
  useUpdatePlannerItem,
  getGetDashboardSummaryQueryKey,
  getListPlannerItemsQueryKey
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd")
  const hour = new Date().getHours()

  // Queries
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary()
  const { data: tasks, isLoading: isLoadingTasks } = useListPlannerItems({ from: today, type: "homework" })
  const { data: allPlannerItems, isLoading: isLoadingSchedule } = useListPlannerItems({ from: today, to: today })
  const { data: quote } = useGetDailyQuote()

  // Mutations
  const queryClient = useQueryClient()
  const updatePlannerItem = useUpdatePlannerItem()

  const toggleTask = (id: number, currentCompleted: boolean) => {
    updatePlannerItem.mutate(
      { id, data: { completed: !currentCompleted } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlannerItemsQueryKey() })
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() })
        }
      }
    )
  }

  // Schedule filtering & mapping
  const schedule = allPlannerItems
    ? [...allPlannerItems]
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return -1; // "All day" first
          if (!b.startTime) return 1;
          return a.startTime.localeCompare(b.startTime);
        })
        .map(item => ({
          id: item.id,
          time: item.startTime || "All Day",
          title: item.title,
          type: item.type
        }))
    : []

  // Greeting logic
  let greeting = "Hello"
  let GreetingIcon = "👋"
  let greetingSubtitle = "Let's bloom today."
  
  if (hour < 12) {
    greeting = "Good morning"
    GreetingIcon = "🌸"
    greetingSubtitle = "Let's bloom today."
  } else if (hour < 18) {
    greeting = "Good afternoon"
    GreetingIcon = "☀️"
    greetingSubtitle = "Keep up the great work."
  } else {
    greeting = "Good evening"
    GreetingIcon = "🌙"
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
      <div className="space-y-12 animate-in fade-in duration-700 pb-10">
        
        {/* Header Section */}
        <header className="flex items-end justify-between">
          <div className="space-y-3">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-2xl shadow-sm">
                {GreetingIcon}
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight font-semibold">
                {greeting}, {name}
              </h1>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground text-[1.1rem] ml-[4.5rem]"
            >
              {greetingSubtitle}
            </motion.p>
          </div>
        </header>

        {/* Hero & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Main Focus Card */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 bg-primary text-primary-foreground p-8 md:p-10 rounded-[1.5rem] shadow-[0_8px_30px_rgba(233,168,194,0.3)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none text-8xl">
              🎯
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <span className="font-medium text-primary-foreground/90 flex items-center gap-2 text-lg">
                <span>🎯</span> Today's Focus
              </span>
              <div className="mt-12 mb-2">
                <div className="text-6xl md:text-7xl font-serif tracking-tight font-semibold">
                  {isLoadingSummary ? "—" : formatMinutes(summary?.studyMinutesToday || 0)}
                </div>
                <div className="text-primary-foreground/90 mt-3 text-xl">studied today</div>
              </div>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="md:col-span-2 grid grid-cols-2 gap-6">
            <StatCard 
              icon="✅" 
              label="Tasks Due Today" 
              value={isLoadingSummary ? "—" : summary?.tasksDueToday} 
              delay={0.15}
            />
            <StatCard 
              icon="🔥" 
              label="Focus Streak" 
              value={isLoadingSummary ? "—" : summary?.focusStreakDays} 
              delay={0.2}
            />
            <StatCard 
              icon="🚨" 
              label="Upcoming Exams" 
              value={isLoadingSummary ? "—" : summary?.upcomingExamsCount} 
              delay={0.25}
              className="col-span-2"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-2xl font-serif font-semibold tracking-tight flex items-center gap-2">✨ Quick Actions</h2>
          </div>
          <QuickActions />
        </section>

        {/* Main Content Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Schedule & Tasks */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Today's Schedule */}
            <section className="bg-card border border-transparent rounded-[1.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-8">
                <div className="text-2xl">
                  📅
                </div>
                <h2 className="text-2xl font-serif font-semibold tracking-tight">Today's Schedule</h2>
              </div>
              
              <div className="space-y-4">
                {isLoadingSchedule ? (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">Loading schedule...</div>
                ) : schedule && schedule.length > 0 ? (
                  <div className="relative border-l-2 border-secondary ml-4 space-y-8">
                    {schedule.map((event) => (
                      <div key={event.id} className="relative pl-8">
                        <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-[5px] border-card bg-primary shadow-sm" />
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5">
                          <span className="font-mono text-[15px] text-primary font-semibold">{event.time}</span>
                          <span className="font-medium text-card-foreground text-[17px]">{event.title}</span>
                          <span className="text-[11px] px-3 py-1 rounded-full bg-secondary text-secondary-foreground uppercase tracking-widest font-bold ml-auto sm:ml-0">
                            {event.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                    <span className="text-4xl mb-4 opacity-50">🍃</span>
                    <p className="text-lg">Nothing scheduled yet. A clear day ahead.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Today's Tasks */}
            <section className="bg-card border border-transparent rounded-[1.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-8">
                <div className="text-2xl">
                  ✅
                </div>
                <h2 className="text-2xl font-serif font-semibold tracking-tight">Tasks Due Today</h2>
              </div>
              
              <div className="space-y-3">
                {isLoadingTasks ? (
                  <div className="py-8 text-center text-muted-foreground animate-pulse">Loading tasks...</div>
                ) : tasks && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      key={task.id} 
                      className={`flex items-start gap-5 p-5 rounded-2xl transition-all shadow-sm ${task.completed ? 'bg-secondary/20 opacity-60' : 'bg-secondary/40 hover:bg-secondary/60'}`}
                    >
                      <button 
                        onClick={() => toggleTask(task.id, task.completed)}
                        className="mt-0.5 text-xl transition-transform hover:scale-110 shrink-0"
                      >
                        {task.completed ? "☑️" : "⬜"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-[16px] leading-tight ${task.completed ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                          {task.title}
                        </p>
                        {task.subject && (
                          <p className="text-[13px] text-muted-foreground mt-1.5 font-medium">
                            {task.subject}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                    <span className="text-4xl mb-4 opacity-50">✨</span>
                    <p className="text-lg">All caught up. Good work.</p>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Right Column: Progress & Quote */}
          <div className="space-y-10">
            
            {/* Bloom Progress */}
            <motion.section 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-card border border-transparent rounded-[1.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="text-2xl">
                  🌱
                </div>
                <h2 className="text-2xl font-serif font-semibold tracking-tight">Bloom Progress</h2>
              </div>
              
              <div className="space-y-5">
                <div className="flex justify-between items-end">
                  <span className="font-semibold text-foreground text-lg">
                    {isLoadingSummary ? "..." : summary?.bloomProgressLabel}
                  </span>
                  <span className="text-[15px] font-mono font-medium text-primary">
                    {isLoadingSummary ? "0%" : `${summary?.bloomProgressPercent}%`}
                  </span>
                </div>
                <Progress 
                  value={summary?.bloomProgressPercent || 0} 
                  className="h-4 rounded-full bg-secondary"
                />
                <p className="text-[13px] text-muted-foreground pt-3 font-medium leading-relaxed">
                  Studying is rewarded with better studying. Keep going.
                </p>
              </div>
            </motion.section>

            {/* Daily Quote */}
            <motion.section 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-secondary text-secondary-foreground rounded-[1.5rem] p-10 shadow-sm flex flex-col justify-center min-h-[260px] relative overflow-hidden"
            >
              <div className="text-6xl mb-6 opacity-30">💭</div>
              {quote ? (
                <>
                  <p className="font-serif text-2xl md:text-3xl leading-relaxed mb-8 font-medium">"{quote.text}"</p>
                  {quote.author && (
                    <p className="text-[13px] font-bold tracking-widest uppercase opacity-80 mt-auto">
                      — {quote.author}
                    </p>
                  )}
                </>
              ) : (
                <div className="animate-pulse flex flex-col gap-4">
                  <div className="h-5 bg-secondary-foreground/10 rounded-full w-full"></div>
                  <div className="h-5 bg-secondary-foreground/10 rounded-full w-3/4"></div>
                  <div className="h-4 bg-secondary-foreground/10 rounded-full w-1/2 mt-4"></div>
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
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-card border border-transparent p-7 rounded-[1.5rem] flex flex-col justify-between min-h-[160px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] ${className}`}
    >
      <div className="flex items-center gap-2.5 text-muted-foreground font-medium text-[15px]">
        <span className="text-xl">{icon}</span> {label}
      </div>
      <div className="text-5xl md:text-6xl font-serif tracking-tight mt-5 text-foreground font-semibold">
        {value}
      </div>
    </motion.div>
  )
}