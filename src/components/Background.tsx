import { useEffect, useMemo, useRef, useState } from 'react'
import { bgUrl } from '../lib/days'

interface Props {
  index: number
  effects?: boolean
}

export function Background({ index, effects = true }: Props) {
  const [layers, setLayers] = useState<{ i: number; key: number; loaded: boolean }[]>([{ i: index, key: 0, loaded: false }])
  const parallax = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1].i === index ? prev : [...prev.slice(-1), { i: index, key: Date.now(), loaded: false }]))
  }, [index])

  useEffect(() => {
    const top = layers[layers.length - 1]
    if (top.loaded) return
    const img = new Image()
    img.onload = img.onerror = () => {
      setLayers((prev) => prev.map((l) => (l.key === top.key ? { ...l, loaded: true } : l)))
      setTimeout(() => setLayers((prev) => (prev.length > 1 ? prev.slice(-1) : prev)), 1400)
    }
    img.src = bgUrl(top.i)
  }, [layers])

  useEffect(() => {
    if (!effects || !matchMedia('(pointer: fine)').matches) return
    let raf = 0
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth - 0.5) * -18
        const y = (e.clientY / innerHeight - 0.5) * -12
        if (parallax.current) parallax.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
      })
    }
    window.addEventListener('pointermove', on)
    return () => { window.removeEventListener('pointermove', on); cancelAnimationFrame(raf) }
  }, [effects])

  const bubbles = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: `${Math.round(rnd() * 100)}%`,
      s: `${Math.round(8 + rnd() * 30)}px`,
      d: `${Math.round(14 + rnd() * 18)}s`,
      delay: `${-Math.round(rnd() * 30)}s`,
      sway: `${Math.round((rnd() - 0.5) * 80)}px`,
    }))
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a4e9e]">
      <div ref={parallax} className="bg-parallax">
        {layers.map((l, idx) => (
          <div key={l.key} className="absolute inset-0">
            <div className="bg-layer blur-xl" style={{ backgroundImage: `url(${bgUrl(l.i, true)})`, opacity: !l.loaded && idx === 0 ? 1 : 0 }} />
            <div
              className="bg-layer"
              style={{ backgroundImage: l.loaded ? `url(${bgUrl(l.i)})` : undefined, opacity: l.loaded ? 1 : 0, animationPlayState: effects ? 'running' : 'paused' }}
            />
          </div>
        ))}
      </div>
      <div className="bg-veil" />
      {effects && bubbles.map((b) => (
        <span key={b.id} className="float-bubble" style={{ ['--x' as string]: b.x, ['--s' as string]: b.s, ['--d' as string]: b.d, ['--delay' as string]: b.delay, ['--sway' as string]: b.sway }} />
      ))}
    </div>
  )
}
