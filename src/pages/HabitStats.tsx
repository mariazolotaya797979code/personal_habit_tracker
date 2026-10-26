import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AreaTrend, Bars, RingGauge } from '../components/charts'
import { Heatmap, type HeatValue } from '../components/Heatmap'
import { Ball, Card, cx, EmptyState, PageHeader } from '../components/ui'
import { addDays, formatShort, formatTiny, plural, rangeKeys } from '../lib/date'
import { completionRate, isDone, isScheduled, scheduleText, streakInfo, totalValue } from '../lib/habits'
import type { DateKey } from '../lib/types'
import { useData } from '../store/app'

export default function HabitStats() {
  const { id } = useParams()
  const { data, today } = useData()
  const habit = data.habits.find((h) => h.id === id)

  const series = useMemo(() => {
    if (!habit) return []
    return rangeKeys(addDays(today, -29), today).map((k) => ({ label: formatTiny(k), value: data.entries[habit.id]?.[k] ?? 0 }))
  }, [habit, data.entries, today])

  const weekly = useMemo(() => {
    if (!habit) return []
    return Array.from({ length: 12 }, (_, i) => {
      const end = addDays(today, -7 * (11 - i))
      const keys = rangeKeys(addDays(end, -6), end)
      const done = keys.filter((k) => isDone(data.entries, habit.id, k)).length
      return { label: formatTiny(keys[0]), done }
    })
  }, [habit, data.entries, today])

  const heat = useMemo(() => {
    const out: Record<DateKey, HeatValue> = {}
    if (!habit) return out
    for (const k of rangeKeys(addDays(today, -371), today)) {
      const done = isDone(data.entries, habit.id, k)
      if (done || isScheduled(habit, k)) out[k] = { done: done ? 1 : 0, total: 1 }
    }
    return out
  }, [habit, data.entries, today])

  if (!habit) {
    return <Card><EmptyState emoji="🔍" title="Привычка не найдена" action={<Link to="/app/stats" className="btn btn-primary">К общей статистике</Link>} /></Card>
  }

  const s = streakInfo(habit, data.entries, today)
  const unitWord = (n: number) => (s.unit === 'weeks' ? plural(n, 'неделя', 'недели', 'недель') : plural(n, 'день', 'дня', 'дней'))
  const total = totalValue(habit, data.entries)
  const doneCount = Object.values(data.entries[habit.id] ?? {}).filter((v) => v > 0).length
  const category = data.categories.find((c) => c.id === habit.categoryId)

  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3"><Ball color={habit.color} size={54}>{habit.icon}</Ball><span className="min-w-0 break-words">{habit.name}</span></span>}
        subtitle={`${scheduleText(habit.schedule)}${category ? ` · ${category.icon} ${category.name}` : ''} · с ${formatShort(habit.createdAt)}${habit.archived ? ' · в архиве' : ''}`}
        action={<Link to={`/app/habits/${habit.id}/edit`} className="btn btn-ghost">✏️ Изменить</Link>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <Card className="pop-in text-center !px-2">
          <div className="text-soft text-sm font-extrabold">Текущая серия</div>
          <div className="mt-1 text-4xl font-black tabular-nums sm:text-6xl"><span className={cx(s.current >= 3 && 'flame')}>🔥</span>{s.current}</div>
          <div className="text-soft font-bold">{unitWord(s.current)}</div>
        </Card>
        <Card className="pop-in text-center !px-2">
          <div className="text-soft text-sm font-extrabold">Лучшая серия</div>
          <div className="mt-1 text-4xl font-black tabular-nums sm:text-6xl">⚡{s.best}</div>
          <div className="text-soft font-bold">{unitWord(s.best)}</div>
        </Card>
        <Card className="pop-in col-span-2">
          <div className="text-soft mb-2 text-sm font-extrabold">Процент выполнения</div>
          <div className="flex flex-wrap justify-around gap-2">
            <RingGauge value={completionRate(habit, data.entries, today, 7)} label="7 дней" color={habit.color} size={92} />
            <RingGauge value={completionRate(habit, data.entries, today, 15)} label="15 дней" color={habit.color} size={92} />
            <RingGauge value={completionRate(habit, data.entries, today, 30)} label="30 дней" color={habit.color} size={92} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-3 lg:gap-6">
        <Card className="min-w-0 lg:col-span-2">
          <h2 className="mb-2 text-lg font-black">Последние 30 дней{habit.unit !== 'times' && `, ${habit.unitLabel}`}</h2>
          <Bars data={series} dataKey="value" color={habit.color} unit={habit.unit !== 'times' ? ` ${habit.unitLabel}` : ''} />
        </Card>
        <Card className="min-w-0">
          <h2 className="mb-3 text-lg font-black">Итоги</h2>
          <ul className="space-y-2 font-bold">
            <li className="flex justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>✅ Выполнено раз</span><span>{doneCount}</span></li>
            {habit.unit !== 'times' && <li className="flex justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>📦 Всего</span><span>{total.toLocaleString('ru-RU')} {habit.unitLabel}</span></li>}
            <li className="flex justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>🛟 Пропусков осталось</span><span>{s.skipsLeft} из {habit.allowedSkips}</span></li>
            {s.previous > 0 && <li className="flex justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>↩️ Прошлая серия</span><span>{s.previous} {unitWord(s.previous)}</span></li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">
        <Card className="min-w-0">
          <h2 className="mb-2 text-lg font-black">Выполнений по неделям</h2>
          <AreaTrend data={weekly} dataKey="done" />
        </Card>
        <Card className="min-w-0">
          <h2 className="mb-3 text-lg font-black">Тепловая карта</h2>
          <Heatmap values={heat} today={today} maxWeeks={30} />
        </Card>
      </div>
    </div>
  )
}
