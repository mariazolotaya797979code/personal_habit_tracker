import { useMemo, useState } from 'react'
import { HabitCheck } from '../components/HabitCheck'
import { heatColor, Heatmap, level, type HeatValue } from '../components/Heatmap'
import { Card, cx, PageHeader, Segmented } from '../components/ui'
import { addDays, formatLong, formatMonth, fromKey, rangeKeys, toKey, WEEKDAYS_SHORT } from '../lib/date'
import { dayProgress, isDone, isScheduled } from '../lib/habits'
import type { DateKey } from '../lib/types'
import { useData } from '../store/app'

export default function Calendar() {
  const { data, today, toggleEntry } = useData()
  const [month, setMonth] = useState(today.slice(0, 7) + '-01')
  const [selected, setSelected] = useState<DateKey>(today)
  const [habitFilter, setHabitFilter] = useState('all')
  const [view, setView] = useState<'month' | 'year'>('month')

  const habits = habitFilter === 'all' ? data.habits : data.habits.filter((h) => h.id === habitFilter)

  const values = useMemo(() => {
    const out: Record<DateKey, HeatValue> = {}
    const earliest = data.habits.reduce((m, h) => (h.createdAt < m ? h.createdAt : m), today)
    const yearAgo = addDays(today, -371)
    for (const k of rangeKeys(earliest < yearAgo ? yearAgo : earliest, today)) {
      const p = dayProgress(habits, data.entries, k)
      const doneAll = habits.filter((h) => isDone(data.entries, h.id, k)).length
      if (doneAll || p.total) out[k] = { done: doneAll, total: Math.max(p.total, doneAll) }
    }
    return out
  }, [habits, data.entries, data.habits, today])

  const first = fromKey(month)
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (DateKey | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(first.getFullYear(), first.getMonth(), i + 1)))]
  while (cells.length % 7) cells.push(null)
  const shiftMonth = (n: number) => setMonth(toKey(new Date(first.getFullYear(), first.getMonth() + n, 1)))
  const nextDisabled = toKey(new Date(first.getFullYear(), first.getMonth() + 1, 1)) > today

  const dayHabits = data.habits.filter((h) => (isScheduled(h, selected) || isDone(data.entries, h.id, selected)) && (!h.archived || isDone(data.entries, h.id, selected)))
  const sel = values[selected]

  return (
    <div>
      <PageHeader title="Календарь и история" subtitle="Смотрите и исправляйте отметки за любой день" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={view} onChange={setView} options={[{ value: 'month', label: 'Месяц' }, { value: 'year', label: 'Тепловая карта' }]} className="glass" />
        <select className="field glass !w-auto max-w-full" value={habitFilter} onChange={(e) => setHabitFilter(e.target.value)} aria-label="Фильтр по привычке">
          <option value="all">Все привычки</option>
          {data.habits.map((h) => <option key={h.id} value={h.id}>{h.icon} {h.name}{h.archived ? ' (архив)' : ''}</option>)}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-6">
        <Card className="min-w-0">
          {view === 'month' ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>◀</button>
                <h2 className="text-xl font-black">{formatMonth(month)}</h2>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Следующий месяц" disabled={nextDisabled} onClick={() => shiftMonth(1)}>▶</button>
              </div>
              <div className="mx-auto max-w-2xl">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-soft sm:gap-2">
                {WEEKDAYS_SHORT.map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
                {cells.map((k, i) => {
                  if (!k) return <div key={i} />
                  const v = values[k]
                  const lvl = level(v)
                  const future = k > today
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={future}
                      onClick={() => setSelected(k)}
                      aria-pressed={selected === k}
                      aria-label={`${formatLong(k)}: ${v ? `${v.done} из ${v.total}` : 'нет отметок'}`}
                      className={cx(
                        'focus-ring relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-black transition-transform sm:rounded-2xl sm:text-base',
                        future ? 'opacity-35' : 'hover:scale-105',
                        lvl === 0 && 'bg-white/35 dark:bg-white/5',
                        lvl >= 3 && 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,.4)]',
                        selected === k && 'z-10 scale-110 hover:scale-110',
                        k === today && 'outline-3 outline-offset-2 outline-[var(--accent)]',
                      )}
                      style={{
                        background: heatColor(lvl),
                        boxShadow: [
                          selected === k && '0 0 0 3px var(--ink), 0 6px 14px -4px rgba(0,0,0,.5)',
                          lvl > 0 && 'inset 0 2px 2px rgba(255,255,255,.6), inset 0 -3px 5px rgba(0,0,0,.18), 0 4px 8px -4px rgba(0,0,0,.4)',
                        ].filter(Boolean).join(', ') || undefined,
                      }}
                    >
                      {fromKey(k).getDate()}
                      {v && v.done > 0 && <span className="hidden text-[10px] font-bold opacity-80 xs:block">{v.done}/{v.total}</span>}
                    </button>
                  )
                })}
              </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-4 text-xl font-black">Активность за год</h2>
              <Heatmap values={values} today={today} selected={selected} onSelect={setSelected} />
            </>
          )}
        </Card>

        <Card className="min-w-0">
          <h2 className="text-lg font-black first-letter:uppercase">{formatLong(selected)}</h2>
          <p className="text-soft mb-4 font-semibold">{sel ? `Выполнено ${sel.done} из ${sel.total}` : 'Нет запланированных привычек'}{selected !== today && ' · можно исправить'}</p>
          {dayHabits.length === 0 ? (
            <p className="text-soft py-6 text-center font-semibold">В этот день привычек ещё не было 🌱</p>
          ) : (
            <ul className="space-y-2">
              {dayHabits.map((h) => {
                const done = isDone(data.entries, h.id, selected)
                return (
                  <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-white/35 p-2 dark:bg-white/5">
                    <HabitCheck size={42} checked={done} color={h.color} label={`${h.name} за ${formatLong(selected)}`} onToggle={() => toggleEntry(h.id, selected)} />
                    <span className="min-w-0 flex-1 truncate font-bold">{h.icon} {h.name}</span>
                    {done && h.unit !== 'times' && <span className="text-soft text-sm font-bold">{data.entries[h.id][selected]} {h.unitLabel}</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
