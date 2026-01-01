"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Download, ExternalLink, FileText, Database, AlertTriangle, RefreshCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiService, type ScanHistoryItem } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export function EvidenceVault() {
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState("")
  const [scans, setScans] = useState<ScanHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{
    status?: string
    mediaType?: string
    verdict?: string
  }>({})

  const loadScans = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getScanHistory(page, 20, filters)
      
      if (response.success) {
        setScans(response.data || [])
        if (response.pagination) {
          setTotalPages(response.pagination.pages)
          setTotal(response.pagination.total)
        }
      }
    } catch (err) {
      console.error("Failed to load scans:", err)
      setError(err instanceof Error ? err.message : "Failed to load scan history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScans()
  }, [page, filters, isAuthenticated])

  const filteredScans = scans.filter((scan) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      scan.id.toLowerCase().includes(searchLower) ||
      scan.hash.toLowerCase().includes(searchLower) ||
      scan.operative.toLowerCase().includes(searchLower)
    )
  })

  const handleViewDetails = async (scanId: string) => {
    try {
      const response = await apiService.getScanDetails(scanId)
      // You could open a modal or navigate to a details page here
      console.log("Scan details:", response.data)
    } catch (err) {
      console.error("Failed to load scan details:", err)
    }
  }

  const handleDelete = async (scanId: string) => {
    if (!confirm("Are you sure you want to delete this scan?")) return
    
    try {
      await apiService.deleteScan(scanId)
      loadScans() // Reload the list
    } catch (err) {
      console.error("Failed to delete scan:", err)
      alert(err instanceof Error ? err.message : "Failed to delete scan")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Please log in to view scan history</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card/30 border border-primary/10 p-4 rounded-sm backdrop-blur-sm">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={16} />
          <Input
            placeholder="SEARCH_BY_ID_HASH_OR_OPERATIVE..."
            className="bg-background/50 border-primary/20 pl-10 font-mono text-[10px] uppercase tracking-widest focus-visible:ring-primary/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="border-primary/20 bg-transparent text-primary text-[10px] font-bold h-9"
            onClick={() => {
              const newFilters = { ...filters }
              if (filters.verdict) {
                delete newFilters.verdict
              } else {
                newFilters.verdict = "DEEPFAKE"
              }
              setFilters(newFilters)
              setPage(1)
            }}
          >
            <Filter size={14} className="mr-2" />
            {filters.verdict ? `FILTER: ${filters.verdict}` : "FILTER_PARAMETERS"}
          </Button>
          <Button 
            variant="outline" 
            className="border-primary/20 bg-transparent text-primary text-[10px] font-bold h-9"
            onClick={loadScans}
            disabled={loading}
          >
            <RefreshCcw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          <span className="text-[11px] font-mono uppercase">{error}</span>
        </div>
      )}

      {/* Evidence Table */}
      <div className="bg-card/20 border border-primary/10 rounded-sm overflow-hidden backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-primary/20 bg-primary/5 text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
          <div className="col-span-2">TIMESTAMP</div>
          <div className="col-span-1">ID</div>
          <div className="col-span-1">TYPE</div>
          <div className="col-span-2 text-center">VERDICT</div>
          <div className="col-span-1 text-center">SCORE</div>
          <div className="col-span-3">SHA256_HASH</div>
          <div className="col-span-1">AGENT</div>
          <div className="col-span-1 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-primary/10">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCcw className="w-8 h-8 text-primary/40 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-xs">Loading scan history...</p>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-xs">No scans found</p>
            </div>
          ) : (
            filteredScans.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 p-4 text-[11px] font-mono hover:bg-primary/5 transition-colors items-center"
              >
                <div className="col-span-2 text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <div className="col-span-1 font-bold text-primary">{item.id}</div>
                <div className="col-span-1 text-muted-foreground">{item.type}</div>
                <div className="col-span-2 flex justify-center">
                  <div
                    className={cn(
                      "px-2 py-0.5 border rounded-sm text-[9px] font-black w-24 text-center",
                      item.result === "AUTHENTIC"
                        ? "text-success border-success/20 bg-success/10"
                        : item.result === "DEEPFAKE"
                          ? "text-destructive border-destructive/20 bg-destructive/10"
                          : "text-warning border-warning/20 bg-warning/10",
                    )}
                  >
                    {item.result}
                  </div>
                </div>
                <div className="col-span-1 text-center font-bold">{item.score}%</div>
                <div className="col-span-3 text-muted-foreground truncate font-mono text-[10px]">{item.hash}</div>
                <div className="col-span-1 text-muted-foreground uppercase">{item.operative}</div>
                <div className="col-span-1 flex justify-end gap-2">
                  <button 
                    className="text-primary hover:text-white p-1 transition-colors" 
                    title="View Full Report"
                    onClick={() => handleViewDetails(item.id)}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button 
                    className="text-primary hover:text-destructive p-1 transition-colors" 
                    title="Delete Scan"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-primary/10">
            <div className="text-[10px] font-mono text-muted-foreground">
              Page {page} of {totalPages} ({total} total scans)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-primary/20 bg-transparent text-primary text-[10px] font-bold h-8"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="border-primary/20 bg-transparent text-primary text-[10px] font-bold h-8"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Export & Summary Footer */}
      <div className="flex justify-between items-center bg-primary/5 border border-primary/20 p-6 rounded-sm">
        <div className="flex gap-8">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total Evidence Collected</p>
            <p className="text-xl font-black text-primary">{total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Deepfakes Isolated</p>
            <p className="text-xl font-black text-destructive">
              {scans.filter((s) => s.result === "DEEPFAKE").length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Authentic Media</p>
            <p className="text-xl font-black text-success">
              {scans.filter((s) => s.result === "AUTHENTIC").length}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            className="bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold px-6 py-4 uppercase tracking-[0.2em] rounded-sm"
            onClick={() => {
              const dataStr = JSON.stringify(scans, null, 2)
              const dataBlob = new Blob([dataStr], { type: "application/json" })
              const url = URL.createObjectURL(dataBlob)
              const link = document.createElement("a")
              link.href = url
              link.download = `scan-history-${new Date().toISOString()}.json`
              link.click()
            }}
          >
            <FileText size={16} className="mr-2" />
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  )
}
