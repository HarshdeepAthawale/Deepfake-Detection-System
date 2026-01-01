"use client"

import { TacticalShell } from "@/components/tactical-shell"
import { MediaScanner } from "@/components/media-scanner"
import { ProtectedRoute } from "@/components/protected-route"

export default function ScannerPage() {
  return (
    <ProtectedRoute>
      <TacticalShell activeTab="scanner">
        <div className="space-y-6">
          {/* Breadcrumb / Section Title */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>MEDIA_SCANNER</span>
            <span>/</span>
            <span>LIVE_INTERCEPTION</span>
          </div>

          <MediaScanner />
        </div>
      </TacticalShell>
    </ProtectedRoute>
  )
}
