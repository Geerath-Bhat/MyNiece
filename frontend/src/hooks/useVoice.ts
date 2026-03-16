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

const ERROR_LABELS: Record<string, string> = {
  'not-allowed': 'Microphone permission denied. Allow mic access in browser settings.',
  'no-speech': 'No speech detected. Try speaking louder or closer to the mic.',
  'audio-capture': 'No microphone found. Check your device.',
  'network': 'Network error: the browser cannot reach Google speech servers. Make sure you are on a stable internet connection and the app is served over HTTPS.',
  'aborted': '',
  'service-not-allowed': 'Speech recognition blocked. Use HTTPS or localhost.',
}

// Wait this long after last word before submitting
const SILENCE_DELAY = 2000

interface UseVoiceOptions {
  onResult: (transcript: string) => void
  lang?: string
}

export function useVoice({ onResult, lang = 'en-US' }: UseVoiceOptions) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')   // live text shown on screen
  const [error, setError] = useState('')
  const [supported] = useState(() => !!getSpeechRecognition())
  const recRef = useRef<SpeechRec | null>(null)
  const finalRef = useRef('')                  // accumulated confirmed words
  const nextFinalIdx = useRef(0)               // track processed final results (Android fix)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)           // prevent double-submit on mobile

  const clearTimer = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current)
  }

  const submit = useCallback((rec: SpeechRec, fromEnd = false) => {
    if (submittedRef.current) return
    const text = finalRef.current.trim()
    finalRef.current = ''
    if (text) {
      submittedRef.current = true
      if (!fromEnd) rec.stop()
      onResult(text)
    }
  }, [onResult])

  const start = useCallback(() => {
    if (!supported || listening) return
    const SR = getSpeechRecognition()
    if (!SR) return

    setError('')
    setInterim('')
    finalRef.current = ''
    nextFinalIdx.current = 0
    submittedRef.current = false

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang

    rec.onstart = () => setListening(true)

    rec.onend = () => {
      clearTimer()
      setListening(false)
      setInterim('')
      // Mobile: Chrome auto-stops even with continuous=true — submit whatever we have
      submit(rec, true)
      finalRef.current = ''
    }

    rec.onresult = (e) => {
      let inter = ''
      // Use nextFinalIdx to avoid re-processing old finals on Android
      // (Android Chrome sometimes resets resultIndex to 0 on every event)
      const startIdx = Math.max(e.resultIndex, nextFinalIdx.current)
      for (let i = startIdx; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalRef.current += e.results[i][0].transcript + ' '
          nextFinalIdx.current = i + 1
        } else {
          inter += e.results[i][0].transcript
        }
      }
      // Show everything the user has said so far
      setInterim((finalRef.current + inter).trim())

      // Reset silence timer — submit 2s after the last word
      clearTimer()
      if (finalRef.current.trim()) {
        silenceTimer.current = setTimeout(() => submit(rec), SILENCE_DELAY)
      }
    }

    rec.onerror = (e) => {
      const msg = ERROR_LABELS[e.error] ?? `Speech error: ${e.error}`
      if (msg) setError(msg)
      clearTimer()
      setListening(false)
      setInterim('')
      finalRef.current = ''
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      setError('Could not start microphone. Is another app using it?')
    }
  }, [listening, supported, lang, submit])

  const stop = useCallback(() => {
    clearTimer()
    // If user manually stops, submit whatever we have (rec.stop() will trigger onend)
    recRef.current?.stop()
  }, [])

  return { listening, interim, supported, error, start, stop }
}
