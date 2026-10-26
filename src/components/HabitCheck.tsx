import { useState } from 'react'
import { cx } from './ui'

export function Smiley({ className, sad }: { className?: string; sad?: boolean }) {
  return (
    <svg viewBox="0 0 52 52" className={className} aria-hidden>
      <ellipse cx="19" cy="22" rx="3.2" ry="4.6" fill="#141414" />
      <ellipse cx="33" cy="22" rx="3.2" ry="4.6" fill="#141414" />
      <path d={sad ? 'M16 38 Q26 29 36 38' : 'M14.5 30.5 Q26 42 37.5 30.5'} stroke="#141414" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

interface Props {
  checked: boolean
  color: string
  label: string
  onToggle: () => void
  size?: number
  disabled?: boolean
}

export function HabitCheck({ checked, color, label, onToggle, size = 52, disabled }: Props) {
  const [burst, setBurst] = useState(0)
  const drops = burst
    ? Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + (burst % 7) * 0.3
        const r = size * (0.75 + (i % 3) * 0.18)
        return { i, dx: `${Math.cos(a) * r}px`, dy: `${Math.sin(a) * r - 6}px`, s: `${4 + (i % 4) * 2}px` }
      })
    : []
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx('check focus-ring', disabled && 'cursor-not-allowed opacity-50')}
      style={{ ['--c' as string]: color, width: size, height: size }}
      onClick={() => {
        if (!checked) setBurst(Date.now())
        onToggle()
      }}
    >
      <span className="bubble" />
      <span className="filled ball" style={{ ['--c' as string]: color }}>
        <Smiley className="face" />
      </span>
      {burst > 0 && (
        <span key={burst} aria-hidden>
          <span className="ripple" />
          {drops.map((d) => (
            <span key={d.i} className="drop" style={{ ['--dx' as string]: d.dx, ['--dy' as string]: d.dy, ['--s' as string]: d.s }} />
          ))}
        </span>
      )}
    </button>
  )
}
