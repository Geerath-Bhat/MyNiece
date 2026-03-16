/**
 * Plays a gentle baby-friendly chime using the Web Audio API.
 * No audio file needed — tones are generated programmatically.
 */
export function playReminderAlarm() {
  try {
    const ctx = new AudioContext()

    const schedule = () => {
      // Gentle 3-note ascending chime: C5 → E5 → G5 → C6
      const notes = [523.25, 659.25, 783.99, 1046.5]
      const noteDuration = 0.35
      const gap = 0.08

      notes.forEach((freq, i) => {
        const startTime = ctx.currentTime + i * (noteDuration + gap)

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        // Soft attack + decay envelope
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration)

        osc.start(startTime)
        osc.stop(startTime + noteDuration)
      })

      // Play the chime twice with a short pause
      const repeatDelay = notes.length * (noteDuration + gap) + 0.3
      notes.forEach((freq, i) => {
        const startTime = ctx.currentTime + repeatDelay + i * (noteDuration + gap)

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration)

        osc.start(startTime)
        osc.stop(startTime + noteDuration)
      })

      // Close context after sound finishes
      const totalDuration = repeatDelay + notes.length * (noteDuration + gap) + 0.5
      setTimeout(() => ctx.close(), totalDuration * 1000)
    }

    // Mobile: AudioContext may start suspended even on user gesture — resume first
    if (ctx.state === 'suspended') {
      ctx.resume().then(schedule)
    } else {
      schedule()
    }
  } catch {
    // AudioContext not available (e.g. SSR or restricted browser)
  }
}
