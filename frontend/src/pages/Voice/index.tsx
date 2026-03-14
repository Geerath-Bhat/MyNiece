import { useState } from 'react'
import { Mic, MicOff, Sparkles } from 'lucide-react'

const EXAMPLES = [
  '"I fed the baby at 3 PM"',
  '"Log diaper change, it was dirty"',
  '"Change feeding interval to 4 hours"',
  '"Turn off diaper reminder"',
  '"Add a bath time reminder at 7 PM"',
]

export default function VoicePage() {
  const [listening, setListening] = useState(false)

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="slide-up w-full">
        <h1 className="text-xl font-bold text-white mb-1">Voice Command</h1>
        <p className="text-sm text-slate-400">Speak naturally to log activities or update reminders</p>
      </div>

      {/* Big mic button */}
      <div className="slide-up-1 relative flex items-center justify-center mt-4">
        {listening && (
          <>
            <span className="absolute w-40 h-40 rounded-full bg-indigo-500/10 animate-ping" />
            <span className="absolute w-32 h-32 rounded-full bg-indigo-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        <button
          onClick={() => setListening((l) => !l)}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 btn-glow
            ${listening
              ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/40 scale-110'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/40'
            }`}
        >
          {listening
            ? <MicOff className="w-10 h-10 text-white" />
            : <Mic className="w-10 h-10 text-white" />
          }
        </button>
      </div>

      <p className="text-sm text-slate-400 slide-up-2">
        {listening ? 'Listening… tap to stop' : 'Tap to speak'}
      </p>

      {/* Transcript area */}
      {listening && (
        <div className="glass-strong w-full p-4 text-left slide-up-2">
          <p className="text-xs text-slate-500 mb-1">Transcript</p>
          <p className="text-slate-300 text-sm italic animate-pulse">Listening…</p>
        </div>
      )}

      {/* Example commands */}
      <div className="glass w-full p-4 text-left slide-up-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Try saying</p>
        </div>
        <ul className="flex flex-col gap-2">
          {EXAMPLES.map((ex) => (
            <li key={ex} className="text-sm text-slate-400 py-1 border-b border-white/5 last:border-0">{ex}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-600 slide-up-4">AI processing activates in Milestone 4</p>
    </div>
  )
}
