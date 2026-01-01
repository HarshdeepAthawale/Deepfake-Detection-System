"use client"

import { useState } from "react"
import { TacticalShell } from "@/components/tactical-shell"
import { MediaScanner } from "@/components/media-scanner"
import { ProtectedRoute } from "@/components/protected-route"
import type { ScanResult } from "@/lib/api"

export default function ScannerPage() {
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)

  const handleScanResult = (result: ScanResult | null) => {
    if (result?.gpsCoordinates) {
      setGpsCoordinates(result.gpsCoordinates)
    } else {
      setGpsCoordinates(null)
    }
  }

  return (
    <ProtectedRoute>
      <TacticalShell activeTab="scanner" gpsCoordinates={gpsCoordinates}>
        <div className="space-y-6">
          {/* Breadcrumb / Section Title */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground mb-4">
            <span className="text-primary">SENTINEL_X</span>
            <span>/</span>
            <span>MEDIA_SCANNER</span>
            <span>/</span>
            <span>LIVE_INTERCEPTION</span>
          </div>

          <MediaScanner onScanResult={handleScanResult} />
        </div>
      </TacticalShell>
    </ProtectedRoute>
  )
}
