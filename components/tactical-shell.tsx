"use client"

import type React from "react"
import { Shield, Activity, Terminal, Lock, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export function TacticalShell({
  children,
  activeTab = "dashboard",
}: { children: React.ReactNode; activeTab?: string }) {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
  }
  return (
    <div className="flex h-screen bg-background text-foreground font-mono uppercase tracking-wider text-xs">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-primary/20 flex flex-col bg-card/50 backdrop-blur-sm z-40">
        <div className="p-4 border-b border-primary/20 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 border border-primary/40 flex items-center justify-center rounded-sm">
            <Shield className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <span className="hidden md:block font-bold text-lg tracking-tighter text-primary">SENTINEL-X</span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
          <NavItem icon={<Activity size={18} />} label="Mission Control" active={activeTab === "dashboard"} />
          <NavItem icon={<Terminal size={18} />} label="Media Scanner" active={activeTab === "scanner"} />
          <NavItem icon={<Lock size={18} />} label="Evidence Vault" active={activeTab === "vault"} />
        </nav>

        <div className="p-4 border-t border-primary/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-muted-foreground hover:text-destructive transition-colors w-full group"
          >
            <LogOut size={18} className="group-hover:rotate-180 transition-transform" />
            <span className="hidden md:block">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header HUD */}
        <header className="h-14 border-b border-primary/20 flex items-center justify-between px-6 bg-card/30 backdrop-blur-md z-30">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">OPERATIVE_ID</span>
              <span className="text-primary">{user?.operativeId || "NOT_LOGGED_IN"}</span>
            </div>
            <div className="h-8 w-[1px] bg-primary/10" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">SYSTEM_STATUS</span>
              <span className={cn(
                "flex items-center gap-1",
                isAuthenticated ? "text-success" : "text-destructive"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isAuthenticated ? "bg-success animate-ping" : "bg-destructive"
                )} />
                {isAuthenticated ? "OPERATIONAL" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[10px] text-muted-foreground">GRID_COORDS</span>
              <span>40.7128° N, 74.0060° W</span>
            </div>
            <div className="bg-primary/5 border border-primary/20 px-3 py-1 rounded-sm text-primary font-bold">
              LVL_4_CLEARANCE
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-auto p-6 relative">
          {/* Decorative Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 pointer-events-none" />

          {children}
        </div>

        {/* Footer HUD Bar */}
        <footer className="h-8 border-t border-primary/20 bg-background/80 flex items-center px-4 justify-between text-[10px] text-muted-foreground">
          <div className="flex gap-4">
            <span>UPLINK: ENCRYPTED_AES_256</span>
            <span>LATENCY: 12ms</span>
          </div>
          <div className="flex gap-4">
            <span>SIG_INT: ACTIVE</span>
            <span>© 2025 SENTINEL_DEFENSE</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 p-3 rounded-sm transition-all relative group",
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden md:block text-[11px] font-bold">{label}</span>
      {active && <div className="absolute right-2 w-1 h-1 bg-primary rounded-full animate-pulse md:block hidden" />}
    </button>
  )
}
