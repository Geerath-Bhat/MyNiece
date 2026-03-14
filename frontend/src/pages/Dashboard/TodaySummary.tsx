import { Milk, Baby, CheckCircle } from 'lucide-react'

interface Props {
  feedCount: number
  diaperCount: number
  vitaminDDone: boolean
}

export function TodaySummary({ feedCount, diaperCount, vitaminDDone }: Props) {
  return (
    <div className="slide-up-2">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-3">Today</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4 flex flex-col gap-1 items-center">
          <Milk className="w-5 h-5 text-indigo-400" />
          <span className="text-2xl font-bold text-white count-up">{feedCount}</span>
          <span className="text-xs text-slate-400">feeds</span>
        </div>
        <div className="glass p-4 flex flex-col gap-1 items-center">
          <Baby className="w-5 h-5 text-cyan-400" />
          <span className="text-2xl font-bold text-white count-up">{diaperCount}</span>
          <span className="text-xs text-slate-400">diapers</span>
        </div>
        <div className="glass p-4 flex flex-col gap-1 items-center">
          <CheckCircle className={`w-5 h-5 ${vitaminDDone ? 'text-emerald-400' : 'text-slate-600'}`} />
          <span className={`text-sm font-bold ${vitaminDDone ? 'text-emerald-400' : 'text-slate-500'}`}>
            {vitaminDDone ? 'Done' : 'Pending'}
          </span>
          <span className="text-xs text-slate-400">Vit. D</span>
        </div>
      </div>
    </div>
  )
}
