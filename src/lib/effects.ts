import confetti from 'canvas-confetti'

export function celebrate(colors: string[]) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const base = { colors, shapes: ['circle'] as confetti.Shape[], scalar: 1.3, gravity: 0.9, ticks: 220, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 48, origin: { x: 0.5, y: 0.75 } })
  setTimeout(() => {
    confetti({ ...base, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } })
    confetti({ ...base, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } })
  }, 220)
}

export function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* вибрация недоступна */
  }
}
