import { useState, useRef, useCallback } from 'react'

// Minimal shape we need from the Web Speech API
interface SpeechRec {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((e: SpeechRecResult) => void) | null
}

interface SpeechRecResult {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Record<string, any>

function getSpeechRecognition(): (new () => SpeechRec) | null {
  const w = window as AnyWindow
  return w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null
}

interface UseVoiceOptions {
  onResult: (transcript: string) => void
  lang?: string
}

export function useVoice({ onResult, lang = 'en-US' }: UseVoiceOptions) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [supported] = useState(() => !!getSpeechRecognition())
  const recRef = useRef<SpeechRec | null>(null)

  const start = useCallback(() => {
    if (!supported || listening) return
    const SR = getSpeechRecognition()
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = lang
    rec.onstart = () => setListening(true)
    rec.onend = () => { setListening(false); setInterim('') }
    rec.onresult = (e) => {
      let final = '', inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else inter += e.results[i][0].transcript
      }
      setInterim(inter)
      if (final.trim()) onResult(final.trim())
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
  }, [listening, supported, lang, onResult])

  const stop = useCallback(() => recRef.current?.stop(), [])

  return { listening, interim, supported, start, stop }
}
