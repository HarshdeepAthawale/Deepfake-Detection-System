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
  riskScore?: number
  hash: string
  operative: string
  status: string
  fileName?: string
  tags?: string[]
  gpsCoordinates?: {
    latitude: number
    longitude: number
  } | null
  explanations?: string[]
}

export interface ScanFilters {
  search?: string
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  mediaType?: "VIDEO" | "AUDIO" | "IMAGE" | "UNKNOWN"
  verdict?: "DEEPFAKE" | "SUSPICIOUS" | "AUTHENTIC"
  startDate?: string
  endDate?: string
  tags?: string[]
  operativeId?: string
  minConfidence?: number
  maxConfidence?: number
  minRiskScore?: number
  maxRiskScore?: number
  latitude?: number
  longitude?: number
  radius?: number
  sortBy?: "date" | "confidence" | "riskScore" | "fileName"
  sortOrder?: "asc" | "desc"
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
   * Batch upload multiple media files for scanning
   */
  async batchUploadScan(
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; data: { batchId: string; totalFiles: number; scansCreated: number; scans: Array<{ scanId?: string; fileName: string; mediaType?: string; status?: string; error?: string }> } }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = getToken();
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `${API_BASE_URL}/scans/batch`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  /**
   * Get scan by ID (alias for getScanDetails)
   */
  async getScan(scanId: string): Promise<{
    success: boolean
    data: ScanResult
  }> {
    return this.getScanDetails(scanId);
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
   * Get scan history with pagination and advanced search/filtering
   */
  async getScanHistory(
    page: number = 1,
    limit: number = 20,
    filters?: ScanFilters
  ): Promise<PaginatedResponse<ScanHistoryItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    // Add all filter parameters
    if (filters) {
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.mediaType) params.append('mediaType', filters.mediaType)
      if (filters.verdict) params.append('verdict', filters.verdict)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','))
      }
      if (filters.operativeId) params.append('operativeId', filters.operativeId)
      if (filters.minConfidence !== undefined) params.append('minConfidence', filters.minConfidence.toString())
      if (filters.maxConfidence !== undefined) params.append('maxConfidence', filters.maxConfidence.toString())
      if (filters.minRiskScore !== undefined) params.append('minRiskScore', filters.minRiskScore.toString())
      if (filters.maxRiskScore !== undefined) params.append('maxRiskScore', filters.maxRiskScore.toString())
      if (filters.latitude !== undefined) params.append('latitude', filters.latitude.toString())
      if (filters.longitude !== undefined) params.append('longitude', filters.longitude.toString())
      if (filters.radius !== undefined) params.append('radius', filters.radius.toString())
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
    }

    return authenticatedRequest(`/scans/history?${params.toString()}`)
  },

  /**
   * Update scan tags
   */
  async updateScanTags(scanId: string, tags: string[]): Promise<{ success: boolean; message: string; data: { scanId: string; tags: string[] } }> {
    return authenticatedRequest(`/scans/${scanId}/tags`, {
      method: "PATCH",
      body: JSON.stringify({ tags }),
    })
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
   * Export scan as PDF
   */
  async exportScanPDF(scanId: string): Promise<Blob> {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}/reports/scans/${scanId}/pdf`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to export PDF")
    }

    return response.blob()
  },

  /**
   * Export scan as JSON
   */
  async exportScanJSON(scanId: string): Promise<Blob> {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}/reports/scans/${scanId}/json`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to export JSON")
    }

    return response.blob()
  },

  /**
   * Export scans as CSV (bulk export)
   */
  async exportScansCSV(filters?: ScanFilters, limit: number = 1000): Promise<Blob> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    })

    if (filters) {
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.mediaType) params.append('mediaType', filters.mediaType)
      if (filters.verdict) params.append('verdict', filters.verdict)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','))
      }
    }

    const token = getToken()
    const response = await fetch(`${API_BASE_URL}/reports/scans/csv?${params.toString()}`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to export CSV")
    }

    return response.blob()
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

  /**
   * Admin: Get all users with pagination
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    filters?: {
      role?: string
      isActive?: boolean | string
      search?: string
    }
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() }),
      ...(filters?.search && { search: filters.search }),
    })

    return authenticatedRequest(`/users?${params.toString()}`)
  },

  /**
   * Admin: Get user by ID
   */
  async getUserById(userId: string): Promise<{ success: boolean; data: any }> {
    return authenticatedRequest(`/users/${userId}`)
  },

  /**
   * Admin: Create new user
   */
  async createUser(userData: {
    email: string
    password?: string
    operativeId?: string
    role?: string
    isActive?: boolean
    metadata?: {
      firstName?: string
      lastName?: string
      department?: string
      clearanceLevel?: string
    }
  }): Promise<{ success: boolean; data: any; message: string }> {
    return authenticatedRequest(`/users`, {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },

  /**
   * Admin: Update user
   */
  async updateUser(
    userId: string,
    userData: {
      email?: string
      password?: string
      operativeId?: string
      role?: string
      isActive?: boolean
      metadata?: {
        firstName?: string
        lastName?: string
        department?: string
        clearanceLevel?: string
      }
    }
  ): Promise<{ success: boolean; data: any; message: string }> {
    return authenticatedRequest(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  },

  /**
   * Admin: Delete user
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return authenticatedRequest(`/users/${userId}`, {
      method: "DELETE",
    })
  },

  /**
   * Admin: Get user statistics
   */
  async getUserStats(): Promise<{
    success: boolean
    data: {
      total: number
      active: number
      inactive: number
      byRole: {
        admin: number
        operative: number
        analyst: number
      }
    }
  }> {
    return authenticatedRequest(`/users/stats`)
  },

  /**
   * Admin: Get system-wide statistics
   */
  async getAdminStats(): Promise<{
    success: boolean
    data: {
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
  }> {
    return authenticatedRequest(`/admin/stats`)
  },

  /**
   * Admin: Get ML service health status
   */
  async getMLHealth(): Promise<{
    success: boolean
    data: {
      enabled: boolean
      healthy: boolean
      serviceUrl: string
      modelVersion: string
      confidenceThreshold: number
      lastChecked: string
    }
  }> {
    return authenticatedRequest(`/admin/ml/health`)
  },

  /**
   * Admin: Get ML service configuration
   */
  async getMLConfig(): Promise<{
    success: boolean
    data: {
      serviceUrl: string
      enabled: boolean
      timeout: number
      retries: number
      modelVersion: string
      confidenceThreshold: number
    }
  }> {
    return authenticatedRequest(`/admin/ml/config`)
  },

  /**
   * Analytics: Get analytics overview
   */
  async getAnalyticsOverview(): Promise<{
    success: boolean
    data: {
      scans: {
        total: number
        last24h: number
        lastWeek: number
        lastMonth: number
      }
      users: {
        total: number
        last24h: number
        lastWeek: number
      }
      verdicts: {
        DEEPFAKE: number
        SUSPICIOUS: number
        AUTHENTIC: number
      }
      mediaTypes: Record<string, number>
      averageRiskScore: number
    }
  }> {
    return authenticatedRequest(`/admin/analytics/overview`)
  },

  /**
   * Analytics: Get scan trends
   */
  async getAnalyticsTrends(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    limit: number = 30
  ): Promise<{
    success: boolean
    data: Array<{
      date: string
      scans: number
      completed: number
      verdicts: {
        deepfake: number
        suspicious: number
        authentic: number
      }
      averageRiskScore: number | null
    }>
  }> {
    return authenticatedRequest(
      `/admin/analytics/trends?period=${period}&limit=${limit}`
    )
  },

  /**
   * Analytics: Get user activity analytics
   */
  async getAnalyticsUsers(): Promise<{
    success: boolean
    data: {
      byRole: Record<
        string,
        {
          total: number
          active: number
          inactive: number
        }
      >
      newUsers: {
        last24h: number
        lastWeek: number
        lastMonth: number
        trend: Array<{
          date: string
          count: number
        }>
      }
      topActiveUsers: Array<{
        userId: string
        operativeId: string
        email: string
        role: string
        scanCount: number
        lastScan: string
      }>
    }
  }> {
    return authenticatedRequest(`/admin/analytics/users`)
  },

  /**
   * Analytics: Get scan analytics
   */
  async getAnalyticsScans(): Promise<{
    success: boolean
    data: {
      statuses: Record<string, number>
      verdicts: {
        DEEPFAKE: number
        SUSPICIOUS: number
        AUTHENTIC: number
      }
      mediaTypes: Record<string, number>
      riskScoreDistribution: Record<string, number>
      averages: {
        confidence: number
        riskScore: number
      }
    }
  }> {
    return authenticatedRequest(`/admin/analytics/scans`)
  },

  /**
   * Audit: Get audit logs
   */
  async getAuditLogs(params?: {
    userId?: string
    operativeId?: string
    action?: string
    resourceType?: string
    resourceId?: string
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<{
    success: boolean
    data: {
      logs: Array<{
        _id: string
        action: string
        userId?: {
          email: string
          operativeId: string
          role: string
        }
        operativeId: string
        userRole: string
        resourceType?: string
        resourceId?: string
        details: any
        ipAddress?: string
        userAgent?: string
        status: string
        errorMessage?: string
        createdAt: string
        updatedAt: string
      }>
      pagination: {
        page: number
        limit: number
        total: number
        pages: number
      }
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    const query = queryParams.toString()
    return authenticatedRequest(`/admin/audit${query ? `?${query}` : ''}`)
  },

  /**
   * Audit: Export audit logs as CSV
   */
  async exportAuditLogs(params?: {
    userId?: string
    operativeId?: string
    action?: string
    resourceType?: string
    resourceId?: string
    status?: string
    startDate?: string
    endDate?: string
  }): Promise<Blob> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    const query = queryParams.toString()
    const token = getToken()
    
    const response = await fetch(`${API_BASE_URL}/admin/audit/export${query ? `?${query}` : ''}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error("Failed to export audit logs")
    }
    
    return response.blob()
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
