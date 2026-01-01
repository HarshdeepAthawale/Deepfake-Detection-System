"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Lock, User, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
        }
      }
    }
  }
}

export function LoginForm() {
  const { login, signup, loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [activeTab, setActiveTab] = useState("login")
  const googleButtonLoginRef = useRef<HTMLDivElement>(null)
  const googleButtonSignupRef = useRef<HTMLDivElement>(null)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  // Initialize Google Sign-In
  useEffect(() => {
    if (!googleClientId || !window.google?.accounts?.id) return

    const initializeButton = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current && !ref.current.hasChildNodes()) {
        window.google!.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        })

        window.google!.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: "100%",
        })
      }
    }

    // Small delay to ensure Google script is loaded
    const timer = setTimeout(() => {
      if (activeTab === "login") {
        initializeButton(googleButtonLoginRef)
      } else {
        initializeButton(googleButtonSignupRef)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [googleClientId, activeTab])

  const handleGoogleSignIn = async (response: { credential: string }) => {
    setLoading(true)
    setError(null)

    try {
      await loginWithGoogle(response.credential)
      // Redirect is handled by auth context
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed")
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signup(email, password)
      // Redirect is handled by auth context
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
      setLoading(false)
    }
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-2xl overflow-hidden group">
      <CardContent className="pt-8 pb-6 px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30">
            <TabsTrigger 
              value="login" 
              className="text-[10px] font-mono font-bold uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="text-[10px] font-mono font-bold uppercase tracking-widest data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleLogin} className="space-y-6">
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

              {googleClientId && (
                <>
                  <div className="flex items-center gap-4 my-4">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  <div ref={googleButtonLoginRef} className="w-full flex justify-center" />
                </>
              )}

              <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground uppercase pt-2">
                <span className="hover:text-primary cursor-pointer transition-colors">Emergency Protocol</span>
                <span className="hover:text-primary cursor-pointer transition-colors">Request Clearance</span>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-0">
            <form onSubmit={handleSignup} className="space-y-6">
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
                      minLength={6}
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
                  {loading ? "Registering..." : "Create Account"}
                  {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
              </Button>

              {googleClientId && (
                <>
                  <div className="flex items-center gap-4 my-4">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">OR</span>
                    <Separator className="flex-1" />
                  </div>
                  <div ref={googleButtonSignupRef} className="w-full flex justify-center" />
                </>
              )}

              <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground uppercase pt-2">
                <span className="hover:text-primary cursor-pointer transition-colors">Emergency Protocol</span>
                <span className="hover:text-primary cursor-pointer transition-colors">Request Clearance</span>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
