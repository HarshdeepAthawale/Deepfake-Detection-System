"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, User, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function LoginForm() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      // Redirect is handled by auth context
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
      setLoading(false)
    }
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-2xl overflow-hidden group">
      <CardContent className="pt-8 pb-6 px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest ml-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40">
                  <User size={16} />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border-primary/20 focus-visible:ring-primary/40 pl-10 font-mono text-sm placeholder:text-muted-foreground/30"
                  placeholder="operative@sentinel.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40">
                  <Lock size={16} />
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-primary/20 focus-visible:ring-primary/40 pl-10 font-mono text-sm placeholder:text-muted-foreground/30"
                  placeholder="••••••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-mono flex items-center gap-2 uppercase tracking-tighter">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] h-12 rounded-sm relative group overflow-hidden"
            disabled={loading}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? "Decrypting..." : "Initialize Session"}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </span>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
          </Button>

          <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground uppercase pt-2">
            <span className="hover:text-primary cursor-pointer transition-colors">Emergency Protocol</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Request Clearance</span>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
