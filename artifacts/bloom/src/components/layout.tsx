import * as React from "react"
import { Link, useLocation } from "wouter"
import { Home, Calendar, BookOpen, Clock, BarChart2, Settings, Leaf } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  
  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Planner", href: "/planner", icon: Calendar },
    { label: "Subjects", href: "/subjects", icon: BookOpen },
    { label: "Focus", href: "/focus", icon: Clock },
    { label: "Progress", href: "/progress", icon: BarChart2 },
  ]

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar px-4 py-8 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 mb-12">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="text-xl font-serif font-medium tracking-tight">Bloom</span>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground hover:bg-muted/80"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-auto pt-4">
          <Link 
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium text-sidebar-foreground hover:bg-muted/80"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-y-auto">
        <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-border pb-safe pt-2 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-2xl">
        {navItems.map((item) => {
          const isActive = location === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
