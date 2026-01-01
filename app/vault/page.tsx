"use client"

import { TacticalShell } from "@/components/tactical-shell"
import { EvidenceVault } from "@/components/evidence-vault"
import { ProtectedRoute } from "@/components/protected-route"

export default function VaultPage() {
  return (
    <ProtectedRoute>
      <TacticalShell activeTab="vault">
        <div className="space-y-6">
          {/* Breadcrumb / Section Title */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>EVIDENCE_VAULT</span>
          </div>

          <EvidenceVault />
        </div>
      </TacticalShell>
    </ProtectedRoute>
  )
}
