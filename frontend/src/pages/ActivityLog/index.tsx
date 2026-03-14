import { Milk, Baby, Sparkles, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const DEMO = [
  { id: '1', type: 'feed',   label: 'Fed baby',        time: new Date(Date.now() - 90 * 60_000),    note: '' },
  { id: '2', type: 'diaper', label: 'Diaper change',   time: new Date(Date.now() - 3 * 3600_000),   note: 'Wet' },
  { id: '3', type: 'feed',   label: 'Fed baby',        time: new Date(Date.now() - 4.5 * 3600_000), note: '' },
  { id: '4', type: 'diaper', label: 'Diaper change',   time: new Date(Date.now() - 6 * 3600_000),   note: 'Dirty' },
  { id: '5', type: 'feed',   label: 'Fed baby',        time: new Date(Date.now() - 7.5 * 3600_000), note: '' },
  { id: '6', type: 'custom', label: 'Vitamin D drops', time: new Date(Date.now() - 10 * 3600_000),  note: '' },
]

const cfg = {
  feed:   { icon: Milk,     color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  diaper: { icon: Baby,     color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  custom: { icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10' },
}

export default function ActivityLogPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between slide-up">
        <h1 className="text-xl font-bold text-white">Activity Log</h1>
        <button className="glass px-3 py-2 flex items-center gap-1.5 rounded-xl text-sm text-slate-300">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="flex flex-col gap-2 slide-up-1">
        {DEMO.map((item) => {
          const { icon: Icon, color, bg } = cfg[item.type as keyof typeof cfg]
          return (
            <div key={item.id} className="glass flex items-center gap-3 px-4 py-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{item.label}</p>
                {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {formatDistanceToNow(item.time, { addSuffix: true })}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-slate-600 mt-2">Live data connects in Milestone 2</p>
    </div>
  )
}
