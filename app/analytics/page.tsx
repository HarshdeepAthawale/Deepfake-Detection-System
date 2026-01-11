"use client"

import { TacticalShell } from "@/components/tactical-shell"
import { AnalyticsProtectedRoute } from "@/components/analytics-protected-route"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"

export default function AnalyticsPage() {
  return (
    <AnalyticsProtectedRoute>
      <TacticalShell activeTab="analytics">
        <div className="space-y-6">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>ANALYTICS</span>
            <span>/</span>
            <span>DASHBOARD</span>
          </div>

          <AnalyticsDashboard />
        </div>
      </TacticalShell>
    </AnalyticsProtectedRoute>
  )
}
