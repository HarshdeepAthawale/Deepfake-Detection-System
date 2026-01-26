"use client"

import { useState, useEffect } from "react"
import { TacticalShell } from "@/components/tactical-shell"
import { AdminProtectedRoute } from "@/components/admin-protected-route"
import { apiService } from "@/lib/api"
import { Users, Activity, ShieldAlert, Zap, TrendingUp, AlertTriangle, Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface AdminStats {
  users: {
    total: number
    active: number
    inactive: number
    byRole: {
      admin: number
      operative: number
      analyst: number
    }
    newLast24h: number
  }
  scans: {
    total: number
    completed: number
    pending: number
    processing: number
    failed: number
    byVerdict: {
      DEEPFAKE: number
      SUSPICIOUS: number
      AUTHENTIC: number
    }
    byMediaType: Record<string, number>
    newLast24h: number
  }
  system: {
    health: string
    uptime: number
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAdminStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Failed to load admin stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  return (
    <AdminProtectedRoute>
      <TacticalShell activeTab="admin">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>ADMIN_PANEL</span>
            <span>/</span>
            <span>SYSTEM_CONTROL</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">
              Loading system statistics...
            </div>
          ) : stats ? (
            <>
              {/* System Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users size={20} />}
                  label="Total Users"
                  value={stats.users.total.toString()}
                  subValue={`${stats.users.active} active`}
                  status="active"
                />
                <StatCard
                  icon={<Activity size={20} />}
                  label="Total Scans"
                  value={stats.scans.total.toString()}
                  subValue={`${stats.scans.completed} completed`}
                  status="active"
                />
                <StatCard
                  icon={<ShieldAlert size={20} />}
                  label="Deepfakes Detected"
                  value={stats.scans.byVerdict.DEEPFAKE.toString()}
                  subValue={`${stats.scans.byVerdict.SUSPICIOUS} suspicious`}
                  status="warning"
                />
                <StatCard
                  icon={<Zap size={20} />}
                  label="System Uptime"
                  value={formatUptime(stats.system.uptime)}
                  subValue={stats.system.health}
                  status="safe"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Statistics */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm">
                    <h2 className="text-sm font-bold text-primary mb-4 border-b border-primary/10 pb-2">
                      USER_STATISTICS
                    </h2>
                    <div className="space-y-3">
                      <StatRow label="Total Users" value={stats.users.total} />
                      <StatRow label="Active" value={stats.users.active} status="safe" />
                      <StatRow label="Inactive" value={stats.users.inactive} status="warning" />
                      <div className="pt-2 border-t border-primary/10">
                        <div className="text-[10px] text-muted-foreground mb-2">BY_ROLE</div>
                        <StatRow label="Admin" value={stats.users.byRole.admin} />
                        <StatRow label="Operative" value={stats.users.byRole.operative} />
                        <StatRow label="Analyst" value={stats.users.byRole.analyst} />
                      </div>
                      <StatRow label="New (24h)" value={stats.users.newLast24h} status="active" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-sm p-6 text-center space-y-4">
                      <Users className="w-8 h-8 text-primary mx-auto" />
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-primary uppercase">User Management</h3>
                        <p className="text-[10px] text-muted-foreground uppercase leading-tight">
                          Manage system users and permissions.
                        </p>
                      </div>
                      <Link href="/admin/users" className="block">
                        <button className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold py-2 transition-all uppercase tracking-widest cursor-pointer">
                          Manage Users
                        </button>
                      </Link>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-sm p-6 text-center space-y-4">
                      <Brain className="w-8 h-8 text-primary mx-auto" />
                      <div className="space-y-1">
                        <h3 className="text-xs font-bold text-primary uppercase">ML Service Config</h3>
                        <p className="text-[10px] text-muted-foreground uppercase leading-tight">
                          Configure ML service integration and monitor health.
                        </p>
                      </div>
                      <Link href="/admin/ml" className="block">
                        <button className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold py-2 transition-all uppercase tracking-widest cursor-pointer">
                          ML Config
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Scan Statistics */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm">
                    <h2 className="text-sm font-bold text-primary mb-4 border-b border-primary/10 pb-2">
                      SCAN_STATISTICS
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <StatRow label="Total Scans" value={stats.scans.total} />
                      <StatRow label="Completed" value={stats.scans.completed} status="safe" />
                      <StatRow label="Pending" value={stats.scans.pending} status="warning" />
                      <StatRow label="Processing" value={stats.scans.processing} status="active" />
                      <StatRow label="Failed" value={stats.scans.failed} status="warning" />
                      <StatRow label="New (24h)" value={stats.scans.newLast24h} status="active" />
                    </div>
                    <div className="pt-4 border-t border-primary/10">
                      <div className="text-[10px] text-muted-foreground mb-2">BY_VERDICT</div>
                      <div className="grid grid-cols-3 gap-2">
                        <VerdictBadge label="DEEPFAKE" value={stats.scans.byVerdict.DEEPFAKE} type="deepfake" />
                        <VerdictBadge label="SUSPICIOUS" value={stats.scans.byVerdict.SUSPICIOUS} type="suspicious" />
                        <VerdictBadge label="AUTHENTIC" value={stats.scans.byVerdict.AUTHENTIC} type="authentic" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm">
                    <h2 className="text-sm font-bold text-primary mb-4 border-b border-primary/10 pb-2">
                      SYSTEM_HEALTH
                    </h2>
                    <div className="space-y-4">
                      <HealthMetric label="SYSTEM_STATUS" value={stats.system.health === "operational" ? 100 : 50} />
                      <HealthMetric label="DATABASE_SYNC" value={100} />
                      <HealthMetric label="API_RESPONSE" value={95} />
                      <HealthMetric label="STORAGE" value={88} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">
              Failed to load statistics
            </div>
          )}
        </div>
      </TacticalShell>
    </AdminProtectedRoute>
  )
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subValue?: string
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
        {subValue && (
          <p className="text-[9px] text-muted-foreground mt-1">{subValue}</p>
        )}
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status?: "safe" | "warning" | "active"
}) {
  const statusColors = {
    safe: "text-success",
    warning: "text-destructive",
    active: "text-primary",
  }

  return (
    <div className="flex justify-between text-[11px] font-mono">
      <span className="text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-bold", status ? statusColors[status] : "text-foreground")}>
        {value}
      </span>
    </div>
  )
}

function VerdictBadge({
  label,
  value,
  type,
}: {
  label: string
  value: number
  type: "deepfake" | "suspicious" | "authentic"
}) {
  const colors = {
    deepfake: "text-destructive bg-destructive/10 border-destructive/20",
    suspicious: "text-destructive bg-destructive/10 border-destructive/20",
    authentic: "text-success bg-success/10 border-success/20",
  }

  return (
    <div className={cn("px-3 py-2 border rounded-sm text-center", colors[type])}>
      <div className="text-[9px] font-black uppercase mb-1">{label}</div>
      <div className="text-sm font-bold">{value}</div>
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

