import { useState, useRef, useCallback } from 'react'

interface SpeechRec {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
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

// Human-readable error labels for SpeechRecognition error codes
const ERROR_LABELS: Record<string, string> = {
  'not-allowed': 'Microphone permission denied. Allow mic access in browser settings.',
  'no-speech': 'No speech detected. Try speaking louder or closer to the mic.',
  'audio-capture': 'No microphone found. Check your device.',
  'network': 'Network error: the browser cannot reach Google speech servers. Make sure you are on a stable internet connection and the app is served over HTTPS.',
  'aborted': '',
  'service-not-allowed': 'Speech recognition blocked. Use HTTPS or localhost.',
}

interface UseVoiceOptions {
  onResult: (transcript: string) => void
  lang?: string
}

export function useVoice({ onResult, lang = 'en-US' }: UseVoiceOptions) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [supported] = useState(() => !!getSpeechRecognition())
  const recRef = useRef<SpeechRec | null>(null)

  const start = useCallback(() => {
    if (!supported || listening) return
    const SR = getSpeechRecognition()
    if (!SR) return

    setError('')
    const rec = new SR()
    rec.continuous = true        // keep listening until user taps Stop
    rec.interimResults = true
    rec.lang = lang

    rec.onstart = () => setListening(true)

    rec.onend = () => {
      setListening(false)
      setInterim('')
    }

    rec.onresult = (e) => {
      let final = '', inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else inter += e.results[i][0].transcript
      }
      setInterim(inter)
      if (final.trim()) {
        onResult(final.trim())
        // Stop after we get a final result so LLM can process it
        rec.stop()
      }
    }

    rec.onerror = (e) => {
      const msg = ERROR_LABELS[e.error] ?? `Speech error: ${e.error}`
      if (msg) setError(msg)
      setListening(false)
      setInterim('')
    }

    recRef.current = rec
    try {
      rec.start()
    } catch (e) {
      setError('Could not start microphone. Is another app using it?')
    }
  }, [listening, supported, lang, onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  return { listening, interim, supported, error, start, stop }
}
