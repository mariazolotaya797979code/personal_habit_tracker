const BUBBLES = [
  { left: '8%', s: '6px', d: '2.6s', delay: '0s' },
  { left: '22%', s: '4px', d: '3.1s', delay: '-1.2s' },
  { left: '37%', s: '7px', d: '2.2s', delay: '-0.6s' },
  { left: '51%', s: '5px', d: '3.4s', delay: '-2s' },
  { left: '66%', s: '6px', d: '2.8s', delay: '-1.6s' },
  { left: '80%', s: '4px', d: '2.4s', delay: '-0.3s' },
  { left: '92%', s: '5px', d: '3s', delay: '-2.4s' },
]

export function LiquidProgress({ done, total, height = 34 }: { done: number; total: number; height?: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div
      className="tube"
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`Выполнено ${done} из ${total}`}
    >
      <div className="tube-fill" style={{ width: `${Math.max(pct, done > 0 ? 8 : 0)}%` }}>
        {BUBBLES.map((b, i) => (
          <span key={i} className="tube-bubble" style={{ left: b.left, ['--s' as string]: b.s, ['--d' as string]: b.d, ['--delay' as string]: b.delay }} />
        ))}
      </div>
      <div className="tube-shine" />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 [text-shadow:0_1px_0_rgba(255,255,255,.7)] dark:text-white dark:[text-shadow:0_1px_3px_rgba(0,0,0,.7)]">
        {pct}%
      </div>
    </div>
  )
}
