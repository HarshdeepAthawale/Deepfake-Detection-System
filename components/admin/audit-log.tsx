"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Search, Calendar } from "lucide-react"

interface AuditLog {
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
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    status: "",
    operativeId: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit: 50,
      }
      
      if (filters.action) params.action = filters.action
      if (filters.resourceType) params.resourceType = filters.resourceType
      if (filters.status) params.status = filters.status
      if (filters.operativeId) params.operativeId = filters.operativeId
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const response = await apiService.getAuditLogs(params)
      if (response.success) {
        setLogs(response.data.logs)
        setTotalPages(response.data.pagination.pages)
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params: any = {}
      if (filters.action) params.action = filters.action
      if (filters.resourceType) params.resourceType = filters.resourceType
      if (filters.status) params.status = filters.status
      if (filters.operativeId) params.operativeId = filters.operativeId
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const blob = await apiService.exportAuditLogs(params)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-logs-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export audit logs:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>
      case "failure":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Failure</Badge>
      case "error":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Error</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Operative ID"
            value={filters.operativeId}
            onChange={(e) => setFilters({ ...filters, operativeId: e.target.value })}
            className="font-mono text-xs"
          />
          <Input
            placeholder="Action"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="font-mono text-xs"
          />
          <Select value={filters.resourceType} onValueChange={(value) => setFilters({ ...filters, resourceType: value })}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="Resource Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="scan">Scan</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
            <SelectTrigger className="font-mono text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="font-mono text-xs"
          />
          <Input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={loadLogs} size="sm" variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="p-4">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            No audit logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Timestamp</TableHead>
                    <TableHead className="font-mono text-xs">Action</TableHead>
                    <TableHead className="font-mono text-xs">User</TableHead>
                    <TableHead className="font-mono text-xs">Resource</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="font-mono text-xs">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-mono text-xs">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.action}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.userId?.email || log.operativeId}
                        <div className="text-muted-foreground text-[10px]">{log.userRole}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.resourceType && (
                          <>
                            {log.resourceType}
                            {log.resourceId && <div className="text-muted-foreground text-[10px]">{log.resourceId}</div>}
                          </>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground font-mono">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
