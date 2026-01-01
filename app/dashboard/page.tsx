"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect } from "react"
import { TacticalShell } from "@/components/tactical-shell"
import { Activity, ShieldAlert, Zap, Globe, Fingerprint, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { apiService, type ScanHistoryItem } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    deepfakes: 0,
    authentic: 0,
    suspicious: 0,
  })

  useEffect(() => {
    if (isAuthenticated) {
      loadRecentScans()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const loadRecentScans = async () => {
    try {
      setLoading(true)
      const response = await apiService.getScanHistory(1, 10)
      if (response.success) {
        setRecentScans(response.data || [])
        
        // Calculate stats
        const allScans = response.data || []
        setStats({
          total: response.pagination?.total || 0,
          deepfakes: allScans.filter((s) => s.result === "DEEPFAKE").length,
          authentic: allScans.filter((s) => s.result === "AUTHENTIC").length,
          suspicious: allScans.filter((s) => s.result === "SUSPICIOUS").length,
        })
      }
    } catch (error) {
      console.error("Failed to load recent scans:", error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <ProtectedRoute>
      <TacticalShell activeTab="dashboard">
      <div className="space-y-6">
        {/* Breadcrumb / Section Title */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
          <span className="text-primary">SENTINEL_X</span>
          <span>/</span>
          <span>MISSION_CONTROL</span>
        </div>

        {/* Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<Activity size={20} />} label="Total Scans" value={stats.total.toString()} status="active" />
          <MetricCard icon={<Fingerprint size={20} />} label="Deepfakes Detected" value={stats.deepfakes.toString()} status="warning" />
          <MetricCard icon={<ShieldAlert size={20} />} label="Authentic Media" value={stats.authentic.toString()} status="safe" />
          <MetricCard icon={<Zap size={20} />} label="Suspicious" value={stats.suspicious.toString()} status="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm relative group">
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1 h-1 bg-primary/40 rounded-full" />
                <div className="w-1 h-1 bg-primary/40 rounded-full" />
              </div>
              <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-2">
                <h2 className="text-sm font-bold text-primary">RECENT_SCAN_LOGS</h2>
                <button
                  onClick={loadRecentScans}
                  disabled={loading}
                  className="text-primary/60 hover:text-primary transition-colors"
                >
                  <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    Loading scan history...
                  </div>
                ) : recentScans.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    No scans yet. Start scanning media files!
                  </div>
                ) : (
                  recentScans.map((scan) => (
                    <LogItem
                      key={scan.id}
                      time={new Date(scan.timestamp).toLocaleTimeString()}
                      id={scan.id}
                      type={scan.type}
                      result={scan.result as "AUTHENTIC" | "DEEPFAKE" | "SUSPICIOUS"}
                      score={scan.score}
                      operative={scan.operative}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Widgets */}
          <div className="space-y-6">
            <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm">
              <h2 className="text-sm font-bold text-primary mb-4 border-b border-primary/10 pb-2">SYSTEM_HEALTH</h2>
              <div className="space-y-4">
                <HealthMetric label="AGENT_CORE" value={92} />
                <HealthMetric label="DATABASE_SYNC" value={100} />
                <HealthMetric label="AI_MODEL_V4" value={88} />
                <HealthMetric label="ENCRYPTION_ENGINE" value={100} />
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-sm p-6 text-center space-y-4">
              <Zap className="w-8 h-8 text-primary mx-auto animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-primary uppercase">Initialize Scan</h3>
                <p className="text-[10px] text-muted-foreground uppercase leading-tight">
                  Start real-time media analysis sequence.
                </p>
              </div>
              <Link href="/scanner" className="block">
                <button className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold py-2 transition-all uppercase tracking-widest cursor-pointer">
                  Start Terminal
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </TacticalShell>
    </ProtectedRoute>
  )
}

function MetricCard({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  status: "safe" | "warning" | "active"
}) {
  const statusColors = {
    safe: "text-success",
    warning: "text-destructive",
    active: "text-primary",
  }

  return (
    <div className="bg-card/40 border border-primary/10 p-4 rounded-sm flex flex-col justify-between group hover:border-primary/30 transition-colors relative overflow-hidden">
      <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 -rotate-45 translate-x-6 -translate-y-6" />
      <div className="flex items-center justify-between mb-4">
        <div className="text-primary/60">{icon}</div>
        <div className={cn("text-[10px] font-bold uppercase", statusColors[status])}>
          {status === "safe" ? "STABLE" : status === "warning" ? "ALERT" : "LIVE"}
        </div>
      </div>
      <div>
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-foreground">{value}</p>
      </div>
    </div>
  )
}

function LogItem({
  time,
  id,
  type,
  result,
  score,
  operative,
}: {
  time: string
  id: string
  type: string
  result: "AUTHENTIC" | "DEEPFAKE" | "SUSPICIOUS"
  score: number
  operative: string
}) {
  const resultColors = {
    AUTHENTIC: "text-success bg-success/10 border-success/20",
    DEEPFAKE: "text-destructive bg-destructive/10 border-destructive/20",
    SUSPICIOUS: "text-destructive bg-destructive/10 border-destructive/20",
  }

  return (
    <div className="flex items-center gap-3 text-[11px] font-mono p-2 hover:bg-primary/5 border border-transparent hover:border-primary/10 transition-all rounded-sm">
      <span className="text-muted-foreground w-20 shrink-0">{time}</span>
      <span className="text-primary w-32 shrink-0 font-bold truncate">{id}</span>
      <span className="text-muted-foreground w-16 shrink-0">{type}</span>
      <div className={cn("px-2 py-0.5 border rounded-sm text-[9px] font-black shrink-0 text-center", resultColors[result])}>
        {result}
      </div>
      <div className="flex-1 bg-primary/5 h-1 relative overflow-hidden rounded-full min-w-[60px]">
        <div className="absolute inset-y-0 left-0 bg-primary/40" style={{ width: `${score}%` }} />
      </div>
      <span className="text-muted-foreground w-24 shrink-0 text-right truncate">{operative}</span>
    </div>
  )
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-muted-foreground uppercase">{label}</span>
        <span className={cn(value > 90 ? "text-success" : "text-warning")}>{value}%</span>
      </div>
      <div className="h-1 bg-primary/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-1000", value > 90 ? "bg-success/60" : "bg-warning/60")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
