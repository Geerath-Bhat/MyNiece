import { Milk, Baby, Pill, Dumbbell } from 'lucide-react'

interface Action {
  label: string
  icon: React.ElementType
  gradient: string
  glow: string
  onClick: () => void
}

interface Props {
  onFeed: () => void
  onDiaper: () => void
  onVitaminD: () => void
  onExercise: () => void
}

export function QuickActions({ onFeed, onDiaper, onVitaminD, onExercise }: Props) {
  const actions: Action[] = [
    {
      label: 'Feed',
      icon: Milk,
      gradient: 'from-indigo-500 to-violet-600',
      glow: 'shadow-indigo-500/30',
      onClick: onFeed,
    },
    {
      label: 'Diaper',
      icon: Baby,
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/30',
      onClick: onDiaper,
    },
    {
      label: 'Vitamin D',
      icon: Pill,
      gradient: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-500/30',
      onClick: onVitaminD,
    },
    {
      label: 'Exercise',
      icon: Dumbbell,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/30',
      onClick: onExercise,
    },
  ]

  return (
    <div className="slide-up-1">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Quick Log</p>
      <div className="grid grid-cols-4 gap-3">
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
