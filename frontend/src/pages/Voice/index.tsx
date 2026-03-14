import { useState, useCallback } from 'react'
import { Mic, MicOff, Sparkles, CheckCircle, XCircle, Volume2 } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { voiceApi } from '@/api/voice'
import type { VoiceResult } from '@/api/voice'
import { useBaby } from '@/hooks/useBaby'

const EXAMPLES = [
  '"I fed the baby at 3 PM"',
  '"Log diaper change, it was dirty"',
  '"Change feeding interval to 4 hours"',
  '"Turn off diaper reminder"',
  '"Baby just woke up from sleep"',
]

// Browser TTS — free, no API needed
function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.95
  utt.pitch = 1.0
  window.speechSynthesis.speak(utt)
}

export default function VoicePage() {
  const { baby } = useBaby()
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)

  const handleResult = useCallback(async (transcript: string) => {
    if (!baby) return
    setProcessing(true)
    setResult(null)
    try {
      const r = await voiceApi.interpret(transcript, baby.id)
      setResult(r)
      if (ttsEnabled && r.response_message) speak(r.response_message)
    } catch {
      const errMsg = 'Failed to process. Check that GEMINI_API_KEY is set in the backend.'
      setResult({ intent: 'error', entities: {}, action_taken: 'none', response_message: errMsg, success: false })
      if (ttsEnabled) speak(errMsg)
    } finally {
      setProcessing(false)
    }
  }, [baby, ttsEnabled])

  const { listening, interim, supported, start, stop } = useVoice({ onResult: handleResult })

  const handleMic = () => {
    if (listening) stop()
    else { setResult(null); start() }
  }

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="slide-up w-full flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Voice Command</h1>
          <p className="text-sm text-slate-400">Speak naturally to log activities or update reminders</p>
        </div>
        <button
          onClick={() => setTtsEnabled(v => !v)}
          title={ttsEnabled ? 'TTS on — tap to mute' : 'TTS off — tap to enable'}
          className={`glass p-2 rounded-xl transition-all ${ttsEnabled ? 'text-indigo-400' : 'text-slate-600'}`}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Mic button */}
      <div className="slide-up-1 relative flex items-center justify-center mt-4">
        {listening && (
          <>
            <span className="absolute w-40 h-40 rounded-full bg-indigo-500/10 animate-ping" />
            <span className="absolute w-32 h-32 rounded-full bg-indigo-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        <button onClick={handleMic} disabled={!supported || processing}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 btn-glow disabled:opacity-50
            ${listening ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/40 scale-110'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/40'}`}>
          {processing
            ? <span className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            : listening ? <MicOff className="w-10 h-10 text-white" />
            : <Mic className="w-10 h-10 text-white" />}
        </button>
      </div>

      <p className="text-sm text-slate-400 slide-up-2">
        {!supported ? 'Voice not supported in this browser'
          : processing ? 'Processing...'
          : listening ? 'Listening… tap to stop'
          : 'Tap to speak'}
      </p>

      {/* Live transcript */}
      {(listening && interim) && (
        <div className="glass-strong w-full p-4 text-left slide-up-2">
          <p className="text-xs text-slate-500 mb-1">Hearing...</p>
          <p className="text-slate-300 text-sm italic">{interim}</p>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className={`glass-strong w-full p-4 text-left slide-up ${result.success ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.success
              ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <p className={`text-sm font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.response_message}
            </p>
          </div>
          <p className="text-xs text-slate-500">Intent: {result.intent} · Action: {result.action_taken}</p>
        </div>
      )}

      {/* Example commands */}
      <div className="glass w-full p-4 text-left slide-up-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Try saying</p>
        </div>
        <ul className="flex flex-col gap-2">
          {EXAMPLES.map(ex => (
            <li key={ex} className="text-sm text-slate-400 py-1 border-b border-white/5 last:border-0">{ex}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
