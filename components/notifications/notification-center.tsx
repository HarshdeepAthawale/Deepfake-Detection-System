"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, CheckCheck, X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  readAt?: string
  priority: string
  createdAt: string
}

interface NotificationCenterProps {
  onClose?: () => void
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadNotifications()
      loadUnreadCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await apiService.getNotifications({ limit: 20 })
      if (response.success) {
        setNotifications(response.data.notifications)
      }
    } catch (error) {
      console.error("Failed to load notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount()
      if (response.success) {
        setUnreadCount(response.data.count)
      }
    } catch (error) {
      console.error("Failed to load unread count:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId)
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead()
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await apiService.deleteNotification(notificationId)
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "medium":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="w-full max-w-md p-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
          {onClose && (
            <Button onClick={onClose} size="sm" variant="ghost" className="h-7">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors",
                  !notification.read && "bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn("text-sm font-medium", !notification.read && "font-semibold")}>
                        {notification.title}
                      </h4>
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor(notification.priority))}>
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read && (
                      <Button
                        onClick={() => handleMarkAsRead(notification._id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(notification._id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
