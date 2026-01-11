"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function AnalyticsProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/")
        return
      }
      
      // Allow admin and analyst roles
      if (user?.role !== "admin" && user?.role !== "analyst") {
        router.push("/dashboard")
        return
      }
    }
  }, [isAuthenticated, loading, user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-mono text-xs">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "analyst")) {
    return null
  }

  return <>{children}</>
}
