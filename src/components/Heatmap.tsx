import { useLayoutEffect, useRef, useState } from 'react'
import { addDays, formatShort, fromKey, MONTHS, startOfWeek, WEEKDAYS_SHORT } from '../lib/date'
import type { DateKey } from '../lib/types'
import { cx } from './ui'

export interface HeatValue { done: number; total: number }

const LEVEL_MIX = [0, 30, 55, 78, 100]

export function level(v?: HeatValue): number {
  if (!v || v.done <= 0) return 0
  const r = v.total > 0 ? v.done / v.total : 1
  if (r >= 1) return 4
  if (r >= 0.66) return 3
  if (r >= 0.33) return 2
  return 1
}

export function heatColor(lvl: number) {
  if (lvl === 0) return undefined
  return `color-mix(in oklab, var(--accent-2) ${LEVEL_MIX[lvl]}%, var(--heat-base))`
}

interface Props {
  values: Record<DateKey, HeatValue>
  today: DateKey
  selected?: DateKey | null
  onSelect?: (k: DateKey) => void
  maxWeeks?: number
}

const CELL = 16
const GAP = 4

export function Heatmap({ values, today, selected, onSelect, maxWeeks = 53 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [weeks, setWeeks] = useState(20)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = (width: number) => setWeeks(Math.max(8, Math.min(maxWeeks, Math.floor((width - 28 + GAP) / (CELL + GAP)))))
    fit(el.clientWidth)
    const ro = new ResizeObserver(([e]) => fit(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxWeeks])

  const lastWeek = startOfWeek(today)
  const first = addDays(lastWeek, -(weeks - 1) * 7)
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)))

  return (
    <div ref={ref} className="w-full">
      <div className="flex gap-1">
        <div className="flex flex-col pt-5 text-[10px] font-bold text-soft" style={{ gap: GAP }}>
          {WEEKDAYS_SHORT.map((d, i) => (
            <span key={d} style={{ height: CELL, lineHeight: `${CELL}px` }} className={cx(i % 2 === 1 && 'invisible')}>{d}</span>
          ))}
        </div>
        <div className="flex min-w-0" style={{ gap: GAP }}>
          {cols.map((col, ci) => {
            const firstOfMonth = col.find((k) => fromKey(k).getDate() === 1)
            const leading = ci === 0 && !cols.slice(1, 3).some((c) => c.some((k) => fromKey(k).getDate() === 1))
            return (
              <div key={ci} className="flex flex-col" style={{ gap: GAP }}>
                <span className="h-4 whitespace-nowrap text-[10px] font-bold text-soft" style={{ width: CELL }}>
                  {firstOfMonth || leading ? MONTHS[fromKey(firstOfMonth ?? col[0]).getMonth()].slice(0, 3) : ''}
                </span>
                {col.map((k) => {
                  const future = k > today
                  const v = values[k]
                  const lvl = level(v)
                  const text = `${formatShort(k)}: ${v ? `${v.done} из ${v.total}` : 'нет отметок'}`
                  const Tag = onSelect ? 'button' : 'span'
                  return (
                    <Tag
                      key={k}
                      {...(onSelect ? { type: 'button' as const, disabled: future, onClick: () => onSelect(k), 'aria-label': text } : { 'aria-hidden': true })}
                      title={text}
                      className={cx(
                        'focus-ring block rounded-[5px] transition-transform hover:scale-125',
                        future ? 'opacity-0' : lvl === 0 && 'bg-black/10 dark:bg-white/10',
                        selected === k && 'relative z-10 scale-125',
                        k === today && 'outline-2 outline-offset-1 outline-[var(--accent)]',
                      )}
                      style={{
                        width: CELL,
                        height: CELL,
                        background: heatColor(lvl),
                        boxShadow: [
                          selected === k && '0 0 0 2px var(--ink)',
                          lvl ? 'inset 0 1px 1px rgba(255,255,255,.7), inset 0 -2px 3px rgba(0,0,0,.2), 0 2px 4px -1px rgba(0,0,0,.3)' : 'inset 0 1px 2px rgba(0,0,0,.15)',
                        ].filter(Boolean).join(', '),
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-bold text-soft">
        Меньше
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={cx('inline-block h-3.5 w-3.5 rounded', l === 0 && 'bg-black/10 dark:bg-white/10')} style={{ background: heatColor(l) }} />
        ))}
        Больше
      </div>
    </div>
  )
}
