/**
 * Sentinel Agentic API Service Layer
 * Handles communication between the frontend and the Agentic Backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export interface ScanResult {
  id: string
  timestamp: string
  verdict: "AUTHENTIC" | "DEEPFAKE" | "SUSPICIOUS"
  confidence: number
  riskScore: number
  explanations: string[]
  metadata: {
    facialMatch: number
    audioMatch: number
    ganFingerprint: number
    temporalConsistency: number
  }
  status?: string
  mediaType?: string
  fileName?: string
  hash?: string
  gpsCoordinates?: {
    latitude: number
    longitude: number
  } | null
}

export interface ScanHistoryItem {
  id: string
  timestamp: string
  type: string
  result: "AUTHENTIC" | "DEEPFAKE" | "SUSPICIOUS" | "PENDING"
  score: number
  hash: string
  operative: string
  status: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Get authentication token from localStorage
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

/**
 * Make authenticated API request
 */
async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, clear storage and redirect
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user")
      if (typeof window !== "undefined") {
        window.location.href = "/"
      }
      throw new Error("Unauthorized")
    }

    const error = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }))
    throw new Error(error.message || "Request failed")
  }

  return response.json()
}

/**
 * Upload file with FormData
 */
async function uploadFile<T>(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<T> {
  const token = getToken()
  const formData = new FormData()
  formData.append("file", file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response as T)
        } catch (error) {
          reject(new Error("Invalid JSON response"))
        }
      } else {
        if (xhr.status === 401) {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("user")
          if (typeof window !== "undefined") {
            window.location.href = "/"
          }
          reject(new Error("Unauthorized"))
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.message || "Upload failed"))
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Network error"))
    })

    xhr.open("POST", `${API_BASE_URL}${endpoint}`)
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    }
    xhr.send(formData)
  })
}

export const apiService = {
  /**
   * Register a new user
   */
  async register(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        let errorMessage = "Registration failed"
        try {
          const error = await response.json()
          errorMessage = error.message || error.error || "Registration failed"
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const text = await response.text()
            errorMessage = text || `Registration failed with status ${response.status}`
          } catch {
            errorMessage = `Registration failed with status ${response.status}`
          }
        }
        throw new Error(errorMessage)
      }

      return response.json()
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Unable to connect to server. Please ensure the backend is running.")
      }
      throw error
    }
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        let errorMessage = "Login failed"
        try {
          const error = await response.json()
          errorMessage = error.message || error.error || "Login failed"
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const text = await response.text()
            errorMessage = text || `Login failed with status ${response.status}`
          } catch {
            errorMessage = `Login failed with status ${response.status}`
          }
        }
        throw new Error(errorMessage)
      }

      return response.json()
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Unable to connect to server. Please ensure the backend is running.")
      }
      throw error
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    return authenticatedRequest<{ success: boolean; data: { user: any } }>(
      "/auth/me"
    )
  },

  /**
   * Upload media file for scanning
   */
  async uploadScan(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; data: { scanId: string; status: string; fileName: string; mediaType: string; hash: string } }> {
    return uploadFile("/scans/upload", file, onProgress)
  },

  /**
   * Get scan details by ID
   */
  async getScanDetails(scanId: string): Promise<{
    success: boolean
    data: ScanResult
  }> {
    return authenticatedRequest(`/scans/${scanId}`)
  },

  /**
   * Get scan history with pagination
   */
  async getScanHistory(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string
      mediaType?: string
      verdict?: string
    }
  ): Promise<PaginatedResponse<ScanHistoryItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.mediaType && { mediaType: filters.mediaType }),
      ...(filters?.verdict && { verdict: filters.verdict }),
    })

    return authenticatedRequest(`/scans/history?${params.toString()}`)
  },

  /**
   * Delete scan
   */
  async deleteScan(scanId: string): Promise<{ success: boolean; message: string }> {
    return authenticatedRequest(`/scans/${scanId}`, {
      method: "DELETE",
    })
  },

  /**
   * Poll scan status until completion
   */
  async pollScanStatus(
    scanId: string,
    onUpdate?: (status: string) => void,
    maxAttempts: number = 60,
    interval: number = 2000
  ): Promise<ScanResult> {
    let attempts = 0

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Use authenticatedRequest directly to avoid circular reference
          const response = await authenticatedRequest<{
            success: boolean
            data: ScanResult
          }>(`/scans/${scanId}`)
          const scan = response.data

          if (onUpdate) {
            onUpdate(scan.status || "PENDING")
          }

          if (scan.status === "COMPLETED") {
            resolve(scan)
            return
          }

          if (scan.status === "FAILED") {
            reject(new Error("Scan processing failed"))
            return
          }

          attempts++
          if (attempts >= maxAttempts) {
            reject(new Error("Scan timeout: maximum attempts reached"))
            return
          }

          setTimeout(poll, interval)
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  },
}

// Legacy export for backward compatibility
export const SentinelAPI = {
  async runAnalysis(mediaData: any): Promise<ScanResult> {
    // This is now handled by the backend, but we keep this for compatibility
    throw new Error(
      "Use apiService.uploadScan() instead. This method is deprecated."
    )
  },

  async getVaultData() {
    const response = await apiService.getScanHistory(1, 20)
    return response.data || []
  },
}
