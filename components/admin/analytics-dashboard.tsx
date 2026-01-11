"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/lib/api"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLORS = {
  deepfake: "#ef4444",
  suspicious: "#f59e0b",
  authentic: "#10b981",
  video: "#3b82f6",
  audio: "#8b5cf6",
  image: "#ec4899",
}

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [userActivity, setUserActivity] = useState<any>(null)
  const [scanAnalytics, setScanAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily")

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewRes, trendsRes, usersRes, scansRes] = await Promise.all([
        apiService.getAnalyticsOverview(),
        apiService.getAnalyticsTrends(period, 30),
        apiService.getAnalyticsUsers(),
        apiService.getAnalyticsScans(),
      ])

      if (overviewRes.success) setOverview(overviewRes.data)
      if (trendsRes.success) setTrends(trendsRes.data)
      if (usersRes.success) setUserActivity(usersRes.data)
      if (scansRes.success) setScanAnalytics(scansRes.data)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs font-mono">
        Loading analytics...
      </div>
    )
  }

  const verdictPieData = scanAnalytics?.verdicts
    ? Object.entries(scanAnalytics.verdicts).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  const mediaTypePieData = scanAnalytics?.mediaTypes
    ? Object.entries(scanAnalytics.mediaTypes).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Scans</div>
            <div className="text-2xl font-bold">{overview.scans.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              +{overview.scans.last24h} last 24h
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Users</div>
            <div className="text-2xl font-bold">{overview.users.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              +{overview.users.last24h} last 24h
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Deepfakes Detected</div>
            <div className="text-2xl font-bold text-red-500">{overview.verdicts.DEEPFAKE}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {overview.verdicts.SUSPICIOUS} suspicious
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Avg Risk Score</div>
            <div className="text-2xl font-bold">{overview.averageRiskScore?.toFixed(1) || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Out of 100</div>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="w-full">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="verdicts">Verdicts</TabsTrigger>
          <TabsTrigger value="media">Media Types</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Scan Trends</h3>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="scans" stroke="#3b82f6" name="Total Scans" />
                <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Verdict Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="verdicts.deepfake" fill={COLORS.deepfake} name="Deepfake" />
                <Bar dataKey="verdicts.suspicious" fill={COLORS.suspicious} name="Suspicious" />
                <Bar dataKey="verdicts.authentic" fill={COLORS.authentic} name="Authentic" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="verdicts">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Verdict Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verdictPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {verdictPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Media Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mediaTypePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mediaTypePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#8884d8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          {userActivity && (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-4">Users by Role</h3>
                <div className="space-y-2">
                  {Object.entries(userActivity.byRole || {}).map(([role, data]: [string, any]) => (
                    <div key={role} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium capitalize">{role}</span>
                      <div className="text-sm text-muted-foreground">
                        {data.active} active / {data.total} total
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {userActivity.topActiveUsers && userActivity.topActiveUsers.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-4">Top Active Users</h3>
                  <div className="space-y-2">
                    {userActivity.topActiveUsers.slice(0, 10).map((user: any, index: number) => (
                      <div key={user.userId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="text-sm font-medium">{user.operativeId}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="text-sm font-mono">{user.scanCount} scans</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
