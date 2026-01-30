"use client"

import { useState, useRef, useEffect } from "react"
import {
  Camera,
  Upload,
  Play,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Zap,
  MessageSquare,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiService, type ScanResult } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { initializeSocket, subscribeToScan, unsubscribeFromScan, getSocket, disconnectSocket } from "@/lib/socket"


export function MediaScanner({ onScanResult }: { onScanResult?: (result: ScanResult | null) => void }) {
  const { isAuthenticated, user, token } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle")
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [batchResults, setBatchResults] = useState<Array<{ fileName: string; scanId?: string; status?: string; error?: string; mediaType?: string }>>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const socketInitialized = useRef(false)

  // Initialize Socket.IO when authenticated
  useEffect(() => {
    if (isAuthenticated && user && token && !socketInitialized.current) {
      initializeSocket(token, user.id)
      socketInitialized.current = true
    }

    return () => {
      // Cleanup on unmount - but don't disconnect as other components may use it
      if (currentScanId) {
        unsubscribeFromScan(currentScanId)
      }
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview)
      }
    }
  }, [isAuthenticated, user, token])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview)
      }
    }
  }, [mediaPreview])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (!isAuthenticated) {
      setError("Please log in to upload files")
      return
    }

    if (batchMode || files.length > 1) {
      // Batch upload mode
      setSelectedFiles(files)
      await handleBatchUpload(files)
    } else {
      // Single file upload mode
      const file = files[0]
      // Create preview URL for the file
      const previewUrl = URL.createObjectURL(file)
      setMediaPreview(previewUrl)

      // Determine media type
      if (file.type.startsWith('image/')) {
        setMediaType('image')
      } else if (file.type.startsWith('video/')) {
        setMediaType('video')
      } else if (file.type.startsWith('audio/')) {
        setMediaType('audio')
      } else {
        setMediaType(null)
      }

      await uploadAndScan(file)
    }
  }

  const handleBatchUpload = async (files: File[]) => {
    try {
      setError(null)
      setStatus("uploading")
      setScanning(true)
      setUploadProgress(0)
      setBatchResults([])

      // Limit batch size
      if (files.length > 50) {
        throw new Error("Maximum 50 files allowed per batch")
      }

      // Upload batch
      const batchResponse = await apiService.batchUploadScan(files, (progress) => {
        setUploadProgress(progress)
      })

      if (!batchResponse.success) {
        throw new Error("Batch upload failed")
      }

      setBatchId(batchResponse.data.batchId)
      setStatus("processing")
      setUploadProgress(100)

      // Set batch results
      setBatchResults(batchResponse.data.scans || [])

      // Note: Individual scan progress will be updated via WebSocket
      // For now, we'll show batch status
      setTimeout(() => {
        setStatus("complete")
        setScanning(false)
      }, 1000)

    } catch (err) {
      console.error("Batch upload error:", err)
      setError(err instanceof Error ? err.message : "Batch upload failed")
      setStatus("error")
      setScanning(false)
      setUploadProgress(0)
    }
  }

  const uploadAndScan = async (file: File) => {
    try {
      setError(null)
      setStatus("uploading")
      setScanning(true)
      setUploadProgress(0)
      setScanProgress(0)

      // Upload file
      const uploadResponse = await apiService.uploadScan(file, (progress) => {
        setUploadProgress(progress)
      })

      if (!uploadResponse.success) {
        throw new Error("Upload failed")
      }

      const scanId = uploadResponse.data.scanId
      setCurrentScanId(scanId)
      setStatus("processing")
      setUploadProgress(100)
      setScanProgress(10)

      // Use WebSocket for real-time updates instead of polling
      const socket = getSocket()
      if (!socket || !socket.connected) {
        // Fallback to polling if WebSocket not available
        console.warn('[MEDIA_SCANNER] WebSocket not available, falling back to polling')
        const finalResult = await apiService.pollScanStatus(
          scanId,
          (currentStatus) => {
            if (currentStatus === "PENDING") {
              setScanProgress(20)
            } else if (currentStatus === "PROCESSING") {
              setScanProgress(60)
            }
          },
          60,
          2000
        )

        setScanProgress(100)
        setStatus("complete")
        setScanning(false)
        setResult(finalResult)
        if (onScanResult) {
          onScanResult(finalResult)
        }
        return
      }

      // Subscribe to scan updates via WebSocket
      await new Promise<void>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null
        let completed = false

        const handleUpdate = (data: any) => {
          if (completed) return

          console.log('[MEDIA_SCANNER] Received scan update:', data)

          if (data.type === 'progress') {
            setScanProgress(data.progress || 50)
            if (data.stage) {
              console.log('[MEDIA_SCANNER] Processing stage:', data.stage)
            }
          } else if (data.type === 'complete') {
            completed = true
            if (timeoutId) clearTimeout(timeoutId)

            // Fetch full scan result from API
            apiService.getScan(scanId).then((response) => {
              if (response.success && response.data) {
                const finalResult = response.data
                setScanProgress(100)
                setStatus("complete")
                setScanning(false)
                setResult(finalResult)
                if (onScanResult) {
                  onScanResult(finalResult)
                }
                unsubscribeFn()
                resolve()
              } else {
                unsubscribeFn()
                reject(new Error('Failed to fetch scan result'))
              }
            }).catch((err) => {
              unsubscribeFn()
              reject(err)
            })
          } else if (data.type === 'failed') {
            completed = true
            if (timeoutId) clearTimeout(timeoutId)
            setStatus("error")
            setScanning(false)
            setError(data.error?.message || "Scan failed")
            unsubscribeFn()
            reject(new Error(data.error?.message || "Scan failed"))
          }
        }

        // Subscribe to scan and get unsubscribe function
        const unsubscribeFn = subscribeToScan(scanId, handleUpdate)

        // Set timeout fallback (5 minutes max wait)
        timeoutId = setTimeout(() => {
          if (completed) return
          completed = true
          unsubscribeFn()
          setStatus("error")
          setScanning(false)
          setError("Scan timeout - please check scan status manually")
          reject(new Error("Scan timeout"))
        }, 5 * 60 * 1000)
      })
    } catch (err) {
      console.error("Scan error:", err)
      setError(err instanceof Error ? err.message : "Scan failed")
      setStatus("error")
      setScanning(false)
      setUploadProgress(0)
      setScanProgress(0)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const reset = () => {
    setStatus("idle")
    setUploadProgress(0)
    setScanProgress(0)
    setResult(null)
    setError(null)
    setCurrentScanId(null)
    setSelectedFiles([])
    setBatchResults([])
    setBatchId(null)
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview)
      setMediaPreview(null)
    }
    setMediaType(null)
    if (onScanResult) {
      onScanResult(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const overallProgress = status === "uploading"
    ? uploadProgress * 0.3
    : status === "processing"
      ? 30 + (scanProgress * 0.7)
      : 0

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Primary Scanner View */}
      <div className="xl:col-span-3 space-y-6">
        <div className="relative aspect-video bg-black border border-primary/20 rounded-sm overflow-hidden group">
          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40 z-10" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40 z-10" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/40 z-10" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/40 z-10" />

          {/* Media Display */}
          {mediaPreview && mediaType === "image" && (
            <img
              src={mediaPreview}
              alt="Media preview"
              className="w-full h-full object-contain"
            />
          )}

          {mediaPreview && mediaType === "video" && (
            <video
              ref={videoRef}
              src={mediaPreview}
              className="w-full h-full object-contain"
              controls
              autoPlay
              loop
            />
          )}

          {mediaPreview && mediaType === "audio" && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Zap size={48} className="mx-auto text-primary/40" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AUDIO_FILE_DETECTED</p>
                <audio src={mediaPreview} controls className="w-full max-w-md" />
              </div>
            </div>
          )}

          {/* Default State */}
          {!mediaPreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Camera size={48} className="opacity-20" />
                <p className="font-mono text-[10px] uppercase tracking-widest">Awaiting_Input_Signal...</p>
              </div>
            </div>
          )}

          {/* Overlay Effects */}
          {mediaPreview && status !== "idle" && (
            <>
              <div className="absolute inset-0 bg-primary/5 mix-blend-overlay pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] pointer-events-none" />
            </>
          )}

          {/* HUD Overlay Components */}
          <div className="absolute top-4 left-4 space-y-2">
            <div className="bg-black/60 border border-primary/40 px-3 py-1 text-[10px] font-mono text-primary flex items-center gap-2 backdrop-blur-md">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              REC: LIVE_FEED_ALPHA
            </div>
            <div className="bg-black/60 border border-primary/20 px-3 py-1 text-[10px] font-mono text-muted-foreground">
              BITRATE: 14.2 MBPS
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-mono text-primary uppercase">Agent_Confidence</div>
                <div className="text-[10px] font-mono text-white">
                  {result ? `${result.confidence}%` : status !== "idle" ? `${Math.round(overallProgress)}%` : '0%'}
                </div>
              </div>
              <div className="w-48 h-1 bg-primary/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${result ? result.confidence : overallProgress}%` }}
                />
              </div>
            </div>

            {status !== "idle" && (
              <div className="flex flex-col items-end">
                <div className="text-[10px] font-mono text-muted-foreground mb-1">FPS: 60.02</div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase">ISO: 800</div>
              </div>
            )}
          </div>
        </div>

        {/* Cognitive Assistance Panel */}
        {result && (
          <div className="bg-card/40 border border-primary/20 rounded-sm p-4 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-2">
              <h3 className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
                <MessageSquare size={14} />
                Cognitive_Analysis_Report
              </h3>
              <div className="text-[10px] font-mono text-muted-foreground">REF: SENTINEL_COGNITIVE_V2</div>
            </div>

            <div className="space-y-3">
              {result.explanations.map((text, i) => (
                <div key={i} className="flex gap-3 text-[11px] font-mono leading-relaxed p-2 bg-primary/5 rounded-sm">
                  <div className="text-primary font-bold">{i + 1}.</div>
                  <div className="text-foreground">{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-[11px] font-mono uppercase">{error}</span>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchMode(!batchMode)}
              disabled={status !== "idle"}
              className={cn(
                "border-primary/20 text-primary text-[10px] font-bold h-8",
                batchMode && "bg-primary/20 border-primary/40"
              )}
            >
              {batchMode ? "BATCH MODE" : "SINGLE MODE"}
            </Button>
            {batchMode && (
              <span className="text-[10px] font-mono text-muted-foreground">
                Select multiple files (max 50)
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={status !== "idle"}
              multiple={batchMode}
            />
            <Button
              onClick={handleUploadClick}
              disabled={status !== "idle" || !isAuthenticated}
              className="flex-1 bg-primary text-primary-foreground font-black uppercase tracking-widest h-14 rounded-sm"
            >
              {status === "idle" ? (
                <>
                  <Upload className="mr-2" size={18} />
                  {batchMode ? "Upload & Scan Batch" : "Upload & Scan Media"}
                </>
              ) : status === "uploading" ? (
                <>
                  <Upload className="mr-2 animate-pulse" size={18} />
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : status === "processing" ? (
                <>
                  <Play className="mr-2 animate-pulse" size={18} />
                  {batchMode ? `Processing ${batchResults.length} files...` : `Processing... ${Math.round(scanProgress)}%`}
                </>
              ) : (
                <>
                  <Play className="mr-2" size={18} />
                  {batchMode ? "Batch Complete" : "Scan Complete"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              disabled={status === "idle"}
              className="border-primary/20 hover:bg-primary/5 text-primary font-bold uppercase tracking-widest h-14 rounded-sm px-6 bg-transparent"
            >
              <RefreshCcw size={18} />
            </Button>
          </div>

          {/* Batch File List */}
          {batchMode && selectedFiles.length > 0 && (
            <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm max-h-40 overflow-y-auto">
              <div className="text-[10px] font-mono text-primary uppercase mb-2">SELECTED FILES ({selectedFiles.length})</div>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="text-[10px] font-mono text-muted-foreground truncate">
                    {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch Results */}
          {batchMode && batchResults.length > 0 && (
            <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm max-h-60 overflow-y-auto">
              <div className="text-[10px] font-mono text-primary uppercase mb-2">BATCH RESULTS ({batchResults.length})</div>
              <div className="space-y-2">
                {batchResults.map((result, index) => (
                  <div key={index} className={cn(
                    "text-[10px] font-mono p-2 rounded border",
                    result.scanId ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"
                  )}>
                    {result.fileName}: {result.scanId ? `Scan ID: ${result.scanId}` : `Error: ${result.error || 'Failed'}`}
                  </div>
                ))}
              </div>
              {batchId && (
                <div className="text-[9px] font-mono text-muted-foreground mt-2 pt-2 border-t border-primary/10">
                  Batch ID: {batchId}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Analysis Panel */}
      <div className="space-y-6">
        <div className="bg-card/30 border border-primary/10 rounded-sm p-4 backdrop-blur-sm h-full flex flex-col">
          <h2 className="text-xs font-bold text-primary mb-4 border-b border-primary/10 pb-2 uppercase tracking-tighter">
            Real_Time_Inference
          </h2>

          <div className="flex-1 space-y-6">
            {/* Verdict Display */}
            {result ? (
              <div
                className={cn(
                  "p-4 border rounded-sm text-center space-y-2 animate-in fade-in zoom-in duration-500",
                  result.verdict.includes("DEEPFAKE") || result.verdict.includes("SUSPICIOUS")
                    ? "bg-destructive/10 border-destructive/20 text-destructive"
                    : "bg-success/10 border-success/20 text-success",
                )}
              >
                <div className="mx-auto w-10 h-10 border border-current flex items-center justify-center rounded-sm rotate-45 mb-4">
                  {result.verdict.includes("DEEPFAKE") || result.verdict.includes("SUSPICIOUS") ? (
                    <ShieldAlert className="-rotate-45" />
                  ) : (
                    <ShieldCheck className="-rotate-45" />
                  )}
                </div>
                <div className="text-[10px] font-mono uppercase opacity-70 tracking-[0.2em]">Final Verdict</div>
                <div className="text-lg font-black tracking-tighter uppercase">{result.verdict}</div>
                <div className="text-[10px] font-mono">CONFIDENCE: {result.confidence}%</div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <Fingerprint className="w-12 h-12 text-primary/10 animate-pulse" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase leading-relaxed max-w-[150px]">
                  Awaiting analysis payload for agentic evaluation...
                </p>
              </div>
            )}

            {/* Analysis Metrics */}
            {status !== "idle" && result && (
              <div className="space-y-4">
                <AnalysisMetric label="FACIAL_BIOMETRICS" value={result.metadata?.facialMatch || 0} />
                <AnalysisMetric label="AUDIO_PHONETIC_MATCH" value={result.metadata?.audioMatch || 0} />
                <AnalysisMetric label="GAN_FINGERPRINT" value={result.metadata?.ganFingerprint || 0} />
                <AnalysisMetric label="TEMPORAL_CONSISTENCY" value={result.metadata?.temporalConsistency || 0} />
                {result.metadata?.peakRisk !== undefined && (
                  <AnalysisMetric label="PEAK_RISK_SEGMENT" value={result.metadata.peakRisk} />
                )}
                {result.metadata?.meanRisk !== undefined && (
                  <AnalysisMetric label="MEAN_RISK_LEVEL" value={result.metadata.meanRisk} />
                )}
              </div>
            )}
            {status === "processing" && !result && (
              <div className="space-y-4">
                <AnalysisMetric label="FACIAL_BIOMETRICS" value={scanProgress > 60 ? 50 : scanProgress * 0.8} />
                <AnalysisMetric label="AUDIO_PHONETIC_MATCH" value={scanProgress > 40 ? 30 : scanProgress * 0.7} />
                <AnalysisMetric label="GAN_FINGERPRINT" value={scanProgress > 80 ? 60 : 0} />
                <AnalysisMetric label="TEMPORAL_CONSISTENCY" value={scanProgress > 50 ? 40 : 0} />
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-primary/10">
            <div className="flex items-center gap-2 text-primary">
              <Zap size={14} className="animate-pulse" />
              <span className="text-[9px] font-mono uppercase font-bold">Edge_Inference_Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalysisMetric({ label, value }: { label: string; value: number }) {
  const clampedValue = Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[9px] font-mono">
        <span className="text-muted-foreground uppercase tracking-widest">{label}</span>
        <span className="text-primary font-bold">{Math.round(clampedValue)}%</span>
      </div>
      <div className="h-0.5 bg-primary/5 rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 transition-all duration-300" style={{ width: `${clampedValue}%` }} />
      </div>
    </div>
  )
}
