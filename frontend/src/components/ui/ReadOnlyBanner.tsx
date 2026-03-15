import { ShieldAlert } from 'lucide-react'

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">
        Your account is <span className="font-semibold">pending verification</span>. Ask your household admin to verify you — until then you can view but not make changes.
      </p>
    </div>
  )
}
