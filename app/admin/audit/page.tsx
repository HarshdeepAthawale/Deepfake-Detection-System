"use client"

import { TacticalShell } from "@/components/tactical-shell"
import { AdminProtectedRoute } from "@/components/admin-protected-route"
import { AuditLogViewer } from "@/components/admin/audit-log"

export default function AuditLogPage() {
  return (
    <AdminProtectedRoute>
      <TacticalShell activeTab="admin">
        <div className="space-y-6">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>ADMIN_PANEL</span>
            <span>/</span>
            <span>AUDIT_LOG</span>
          </div>

          <AuditLogViewer />
        </div>
      </TacticalShell>
    </AdminProtectedRoute>
  )
}
