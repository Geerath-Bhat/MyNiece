/**
 * Reminder alarm sounds — different melody per reminder type.
 * Uses Web Audio API (no audio files needed).
 *
 * Pre-unlock the AudioContext on first user gesture so it's ready
 * when a push notification arrives (no gesture available then).
 */

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new AudioContext()
  }
  return _ctx
}

/** Call once on first user tap to unlock audio for background playback. */
export function unlockAudio() {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    // not available
  }
}

type Note = [freq: number, duration: number, volume: number]

// ── Melodies ─────────────────────────────────────────────────────────────────

const MELODIES: Record<string, Note[][]> = {
  // Feeding: gentle ascending chime C5→E5→G5→C6 (twice)
  feeding: [
    [[523.25, 0.35, 0.40], [659.25, 0.35, 0.38], [783.99, 0.35, 0.36], [1046.5, 0.40, 0.42]],
    [[523.25, 0.35, 0.35], [659.25, 0.35, 0.33], [783.99, 0.35, 0.31], [1046.5, 0.40, 0.36]],
  ],
  // Diaper: alert 3-note G5→C6→G5
  diaper: [
    [[783.99, 0.25, 0.45], [1046.5, 0.30, 0.50], [783.99, 0.30, 0.40]],
    [[783.99, 0.25, 0.40], [1046.5, 0.30, 0.45], [783.99, 0.30, 0.35]],
  ],
  // Vitamin D: simple soft double chime C6→E6
  vitamin_d: [
    [[1046.5, 0.30, 0.35], [1318.5, 0.40, 0.30]],
    [[1046.5, 0.30, 0.30], [1318.5, 0.40, 0.25]],
  ],
  // Massage: relaxing wave E5→G5→E5→C5
  massage: [
    [[659.25, 0.35, 0.30], [783.99, 0.35, 0.32], [659.25, 0.35, 0.28], [523.25, 0.45, 0.35]],
    [[659.25, 0.35, 0.25], [783.99, 0.35, 0.27], [659.25, 0.35, 0.23], [523.25, 0.45, 0.30]],
  ],
  // Pre-feed exercise: ascending 4-note C5→E5→G5→A5
  pre_feed_exercise: [
    [[523.25, 0.28, 0.42], [659.25, 0.28, 0.42], [783.99, 0.28, 0.42], [880.00, 0.35, 0.45]],
    [[523.25, 0.28, 0.38], [659.25, 0.28, 0.38], [783.99, 0.28, 0.38], [880.00, 0.35, 0.40]],
  ],
}

// Default / custom: same as feeding
MELODIES.custom = MELODIES.feeding

function playMelody(ctx: AudioContext, phrases: Note[][], gap = 0.08, phraseGap = 0.35): void {
  let t = ctx.currentTime

  phrases.forEach((phrase) => {
    phrase.forEach(([freq, dur, vol]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.start(t)
      osc.stop(t + dur)
      t += dur + gap
    })
    t += phraseGap  // pause between repeated phrases
  })

}

export function playReminderAlarm(reminderType = 'custom') {
  try {
    const ctx = getCtx()
    const phrases = MELODIES[reminderType] ?? MELODIES.custom

    const doPlay = () => {
      playMelody(ctx, phrases)
      // Keep context alive — closing it would require a new user gesture to resume next time
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay)
    } else {
      doPlay()
    }
  } catch {
    // AudioContext not available
  }
}
