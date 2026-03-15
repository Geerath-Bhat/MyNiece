import { useEffect, useState, useRef } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { adminApi, type HouseholdOut } from '@/api/auth'
import { useHouseholdStore } from '@/store/householdStore'
import { useAuthStore } from '@/store/authStore'

export function HouseholdSwitcher() {
  const { user } = useAuthStore()
  const { selectedHousehold, setSelectedHousehold } = useHouseholdStore()
  const [households, setHouseholds] = useState<HouseholdOut[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    adminApi.households().then(setHouseholds).catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ownHousehold = households.find(h => h.id === user?.household_id)
  const active = selectedHousehold ?? ownHousehold

  const select = (h: HouseholdOut) => {
    // Selecting own household clears the override so no ?as_household is sent
    setSelectedHousehold(h.id === user?.household_id ? null : h)
    setOpen(false)
    // Reload so all data refetches with the new household context
    window.location.reload()
  }

  if (households.length === 0) return null

  return (
    <div ref={ref} className="relative px-2 lg:px-3 mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-fuchsia-500/10 hover:bg-fuchsia-500/15 transition-all text-left"
      >
        <Building2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
        <span className="hidden lg:block text-xs font-medium text-fuchsia-300 truncate flex-1">
          {active?.name ?? 'Select household'}
        </span>
        <ChevronDown className={`hidden lg:block w-3 h-3 text-fuchsia-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
          style={{ background: '#120f22', border: '1px solid rgba(217,70,239,0.2)' }}>
          {households.map(h => {
            const isActive = (selectedHousehold?.id ?? user?.household_id) === h.id
            return (
              <button
                key={h.id}
                onClick={() => select(h)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-fuchsia-500/10 transition-colors"
              >
                <div className="w-5 h-5 rounded-md bg-fuchsia-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-fuchsia-300 font-bold">{h.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xs text-slate-200 truncate flex-1">{h.name}</span>
                {isActive && <Check className="w-3 h-3 text-fuchsia-400 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
