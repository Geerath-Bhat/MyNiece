import { useState, useCallback } from 'react'
import { Mic, MicOff, Sparkles, CheckCircle, XCircle, Volume2, AlertTriangle } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { voiceApi } from '@/api/voice'
import type { VoiceResult } from '@/api/voice'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'

const EXAMPLES = [
  '"I fed the baby at 3 PM"',
  '"Log diaper change, it was dirty"',
  '"Change feeding interval to 4 hours"',
  '"Turn off diaper reminder"',
  '"Baby just woke up from sleep"',
]

// Browser TTS — free, no API needed
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => /samantha|karen|moira|fiona|victoria/i.test(v.name)) ??  // Apple
    voices.find(v => /google uk english female/i.test(v.name)) ??             // Chrome desktop
    voices.find(v => /female|woman/i.test(v.name)) ??                         // generic label
    voices.find(v => /en[-_]?(us|gb|au)/i.test(v.lang) && !v.localService) ?? // cloud English
    null
  )
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const doSpeak = () => {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.92
    utt.pitch = 1.05   // natural pitch — 1.6 was robotic/harsh
    utt.volume = 0.9
    const v = pickVoice()
    if (v) utt.voice = v
    window.speechSynthesis.speak(utt)
  }

  // getVoices() is async on Android — wait for the list if it's empty
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  }
}

export default function VoicePage() {
  const { baby } = useBaby()
  const canEdit = useCanEdit()
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
      const errMsg = 'Could not reach the server. Please try again.'
      setResult({ intent: 'error', entities: {}, action_taken: 'none', response_message: errMsg, success: false })
      if (ttsEnabled) speak(errMsg)
    } finally {
      setProcessing(false)
    }
  }, [baby, ttsEnabled])

  const { listening, interim, supported, error: micError, start, stop } = useVoice({ onResult: handleResult })

  const handleMic = () => {
    if (listening) stop()
    else { setResult(null); start() }
  }

  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="slide-up w-full relative flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-1">Voice Command</h1>
          <p className="text-sm text-slate-400">Speak naturally to log activities or update reminders</p>
        </div>
        <button
          onClick={() => setTtsEnabled(v => !v)}
          title={ttsEnabled ? 'TTS on — tap to mute' : 'TTS off — tap to enable'}
          className={`absolute right-0 glass p-2 rounded-xl transition-all ${ttsEnabled ? 'text-indigo-400' : 'text-slate-600'}`}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {!canEdit && <ReadOnlyBanner />}

      {/* Mic button */}
      <div className="slide-up-1 relative flex items-center justify-center mt-4">
        {listening && (
          <>
            <span className="absolute w-40 h-40 rounded-full bg-indigo-500/10 animate-ping" />
            <span className="absolute w-32 h-32 rounded-full bg-indigo-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        <button onClick={handleMic} disabled={!supported || processing || !canEdit}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 btn-glow disabled:opacity-50
            ${listening ? 'bg-gradient-to-br from-red-500 to-pink-600 scale-110'
              : 'bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-700'}`}
          style={listening
            ? { boxShadow: '0 0 0 0 transparent' }
            : { boxShadow: '0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(124,58,237,0.30)' }}>
          {processing
            ? <span className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            : listening ? <MicOff className="w-10 h-10 text-white" />
            : <Mic className="w-10 h-10 text-white" />}
        </button>
      </div>

      <p className="text-sm text-slate-400 slide-up-2">
        {!canEdit ? 'Verification required to use voice commands'
          : !supported ? 'Voice not supported in this browser'
          : processing ? 'Processing...'
          : listening ? 'Listening… tap to stop'
          : 'Tap to speak'}
      </p>
      {micError && (
        <div className="w-full rounded-2xl p-3 flex gap-2 slide-up-2 text-left"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{micError}</p>
        </div>
      )}

      {/* Live transcript */}
      {listening && (
        <div className="glass-strong w-full p-4 text-left slide-up-2 min-h-[64px]">
          <p className="text-xs text-slate-500 mb-1">Hearing…</p>
          <p className="text-slate-300 text-sm italic">
            {interim || <span className="text-slate-600">Start speaking…</span>}
          </p>
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
      <div className="glass-hero w-full p-4 text-left slide-up-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Try saying</p>
        </div>
        <ul className="flex flex-col gap-2">
          {EXAMPLES.map(ex => (
            <li key={ex} className="text-sm text-slate-400 py-1.5 border-b border-white/10 last:border-0">{ex}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
