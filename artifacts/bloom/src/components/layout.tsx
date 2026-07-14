import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  
  const navItems = [
    { label: "Home", href: "/", icon: "🏠" },
    { label: "Planner", href: "/planner", icon: "📅" },
    { label: "Subjects", href: "/subjects", icon: "📚" },
    { label: "Focus", href: "/focus", icon: "🎯" },
    { label: "Progress", href: "/progress", icon: "📊" },
  ]

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-transparent shadow-[4px_0_24px_rgba(0,0,0,0.02)] bg-sidebar px-6 py-10 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 mb-14">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-secondary text-2xl">
            🌱
          </div>
          <span className="text-2xl font-serif font-semibold tracking-tight text-foreground">Bloom</span>
        </div>
        
        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-all text-[15px] font-medium",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(233,168,194,0.3)]" 
                    : "text-sidebar-foreground hover:bg-secondary/50"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        <div className="mt-auto pt-6">
          <Link 
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-all text-[15px] font-medium text-sidebar-foreground hover:bg-secondary/50"
            )}
          >
            <span className="text-lg">⚙️</span>
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pb-20 md:pb-0 overflow-y-auto">
        <div className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-transparent pb-safe pt-3 px-3 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] rounded-t-[1.5rem]">
        {navItems.map((item) => {
          const isActive = location === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-[1rem] transition-all text-xl",
                isActive ? "bg-primary/10 shadow-sm" : "bg-transparent"
              )}>
                {item.icon}
              </div>
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}