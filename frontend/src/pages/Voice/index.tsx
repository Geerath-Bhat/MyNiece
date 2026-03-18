import { useState, useCallback } from 'react'
import { Mic, MicOff, Sparkles, CheckCircle, XCircle, Volume2, AlertTriangle, VolumeX } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { voiceApi } from '@/api/voice'
import type { VoiceResult } from '@/api/voice'
import { useBaby } from '@/hooks/useBaby'
import { useCanEdit } from '@/hooks/useCanEdit'
import { ReadOnlyBanner } from '@/components/ui/ReadOnlyBanner'

const EXAMPLES = [
  { text: 'I fed the baby at 3 PM', intent: 'log feed' },
  { text: 'Log diaper change, it was dirty', intent: 'log diaper' },
  { text: 'Change feeding interval to 4 hours', intent: 'update reminder' },
  { text: 'Turn off diaper reminder', intent: 'toggle reminder' },
  { text: 'Baby just woke up from sleep', intent: 'log sleep' },
]

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(v => /samantha|karen|moira|fiona|victoria/i.test(v.name)) ??
    voices.find(v => /google uk english female/i.test(v.name)) ??
    voices.find(v => /female|woman/i.test(v.name)) ??
    voices.find(v => /en[-_]?(us|gb|au)/i.test(v.lang) && !v.localService) ??
    null
  )
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()

  const doSpeak = () => {
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.92
    utt.pitch = 1.05
    utt.volume = 0.9
    const v = pickVoice()
    if (v) utt.voice = v
    window.speechSynthesis.speak(utt)
  }

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

  function tryExample(text: string) {
    if (!canEdit || processing || listening) return
    setResult(null)
    handleResult(text)
  }

  return (
    <div className="flex flex-col gap-5 items-center text-center">

      {/* Header */}
      <div className="slide-up w-full relative flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-1">Voice Command</h1>
          <p className="text-sm text-slate-400">Speak naturally to log activities or update reminders</p>
        </div>
        <button
          onClick={() => setTtsEnabled(v => !v)}
          title={ttsEnabled ? 'TTS on — tap to mute' : 'TTS off — tap to enable'}
          className="absolute right-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all"
          style={{
            background: ttsEnabled ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
            border: ttsEnabled ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {ttsEnabled
            ? <Volume2 className="w-4 h-4 text-indigo-400" />
            : <VolumeX className="w-4 h-4 text-slate-500" />}
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
            ${listening
              ? 'bg-gradient-to-br from-red-500 to-pink-600 scale-110'
              : 'bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-700'}`}
          style={listening
            ? { boxShadow: '0 0 0 0 transparent' }
            : { boxShadow: '0 8px 32px rgba(124,58,237,0.45), 0 2px 8px rgba(124,58,237,0.30)' }}>
          {processing
            ? <span className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
            : listening
            ? <MicOff className="w-10 h-10 text-white" />
            : <Mic className="w-10 h-10 text-white" />}
        </button>
      </div>

      <p className="text-sm text-slate-400 slide-up-2">
        {!canEdit ? 'Verification required to use voice commands'
          : !supported ? 'Voice not supported in this browser'
          : processing ? 'Processing your command…'
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
        <div className="w-full p-4 text-left slide-up-2 min-h-[64px] rounded-2xl"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p className="text-xs text-indigo-400 mb-1 font-medium">Hearing…</p>
          <p className="text-slate-300 text-sm italic">
            {interim || <span className="text-slate-600">Start speaking…</span>}
          </p>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="w-full text-left slide-up rounded-2xl overflow-hidden"
          style={{
            background: result.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${result.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
          <div className="flex items-start gap-3 p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: result.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
              {result.success
                ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                : <XCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.response_message}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Intent: <span className="text-slate-400">{result.intent}</span>
                {' · '}Action: <span className="text-slate-400">{result.action_taken}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Example commands — tappable chips */}
      <div className="w-full text-left slide-up-3 rounded-2xl p-4"
        style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.20)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <p className="text-xs font-semibold text-slate-300">Try saying</p>
          {canEdit && <p className="text-[10px] text-slate-400 ml-auto">tap to run</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map(ex => (
            <button
              key={ex.text}
              onClick={() => tryExample(ex.text)}
              disabled={!canEdit || processing || listening}
              className="card-surface w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 transition-all group disabled:cursor-default"
            >
              <span className="text-sm text-slate-400 group-hover:text-white transition-colors disabled:group-hover:text-slate-400">
                "{ex.text}"
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 text-violet-400"
                style={{ background: 'rgba(124,58,237,0.15)' }}>
                {ex.intent}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
