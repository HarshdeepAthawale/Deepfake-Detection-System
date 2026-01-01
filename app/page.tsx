import { LoginForm } from "@/components/login-form"
import { Shield } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="h-full w-full bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 border border-primary/40 flex items-center justify-center rounded-sm rotate-45 group transition-all">
            <Shield className="w-10 h-10 text-primary -rotate-45" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-primary uppercase italic">SENTINEL-X</h1>
            <p className="text-muted-foreground text-xs font-mono uppercase tracking-[0.2em]">
              Agentic Deepfake Detection Interface
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Decorative Corner Brackets for the Login Box */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary/40" />
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary/40" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary/40" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary/40" />

          <LoginForm />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 text-[10px] font-mono text-muted-foreground uppercase">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              Srv_01: Online
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              Srv_02: Online
            </span>
            <span className="flex items-center gap-1 text-warning">
              <div className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
              Uplink: Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
