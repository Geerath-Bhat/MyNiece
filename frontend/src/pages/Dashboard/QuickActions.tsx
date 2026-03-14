import { Milk, Baby, Pill, Dumbbell, Moon, Scale } from 'lucide-react'

interface Props {
  onFeed: () => void
  onDiaper: () => void
  onVitaminD: () => void
  onExercise: () => void
  onSleep: () => void
  onWeight: () => void
}

const ACTIONS = (p: Props) => [
  {
    label: 'Feed',
    icon: Milk,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/25',
    onClick: p.onFeed,
  },
  {
    label: 'Diaper',
    icon: Baby,
    gradient: 'from-cyan-500 to-blue-600',
    glow: 'shadow-cyan-500/25',
    onClick: p.onDiaper,
  },
  {
    label: 'Vitamin D',
    icon: Pill,
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-400/25',
    onClick: p.onVitaminD,
  },
  {
    label: 'Sleep',
    icon: Moon,
    gradient: 'from-indigo-500 to-violet-700',
    glow: 'shadow-indigo-500/25',
    onClick: p.onSleep,
  },
  {
    label: 'Weight',
    icon: Scale,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/25',
    onClick: p.onWeight,
  },
  {
    label: 'Exercise',
    icon: Dumbbell,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-500/25',
    onClick: p.onExercise,
  },
]

export function QuickActions(props: Props) {
  const actions = ACTIONS(props)
  return (
    <div className="slide-up-2">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Quick Log</p>
      <div className="grid grid-cols-3 gap-3">
        {actions.map(({ label, icon: Icon, gradient, glow, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`btn-glow flex flex-col items-center gap-2 py-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ${glow} active:scale-95 transition-transform`}
          >
            <Icon className="w-6 h-6 text-white" strokeWidth={1.8} />
            <span className="text-xs font-semibold text-white/90">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
