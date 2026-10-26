import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AreaTrend, Bars, Donut } from '../components/charts'
import { Heatmap, type HeatValue } from '../components/Heatmap'
import { Ball, Card, EmptyState, PageHeader } from '../components/ui'
import { addDays, formatMonth, formatShort, formatTiny, fromKey, rangeKeys } from '../lib/date'
import { dailySeries, overallStats } from '../lib/habits'
import type { DateKey } from '../lib/types'
import { useData } from '../store/app'

function Tile({ emoji, value, label }: { emoji: string; value: React.ReactNode; label: string }) {
  return (
    <Card className="pop-in !p-4">
      <div className="text-2xl" aria-hidden>{emoji}</div>
      <div className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">{value}</div>
      <div className="text-soft text-sm font-bold">{label}</div>
    </Card>
  )
}

export default function Stats() {
  const { data, today } = useData()
  const s = useMemo(() => overallStats(data.habits, data.entries, data.categories, today), [data, today])
  const series = useMemo(() => dailySeries(data.habits, data.entries, today, 30).map((d) => ({ label: formatTiny(d.key), rate: d.rate, done: d.done })), [data, today])
  const weekly = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const end = addDays(today, -7 * (11 - i))
    const keys = rangeKeys(addDays(end, -6), end)
    return { label: formatTiny(keys[0]), done: keys.reduce((a, k) => a + (s.perDay[k] ?? 0), 0) }
  }), [s, today])
  const heat = useMemo(() => {
    const out: Record<DateKey, HeatValue> = {}
    const ds = dailySeries(data.habits, data.entries, today, 371)
    for (const d of ds) if (d.total || d.done) out[d.key] = { done: d.done, total: d.total }
    return out
  }, [data, today])

  if (data.habits.length === 0) {
    return (
      <div>
        <PageHeader title="Статистика" />
        <Card><EmptyState emoji="📊" title="Пока нечего считать" text="Добавьте привычки и отмечайте выполнение — здесь появятся графики и рекорды." action={<Link to="/app/habits/new" className="btn btn-primary">Создать привычку</Link>} /></Card>
      </div>
    )
  }

  const best = s.top.reduce((m, t) => Math.max(m, t.streak.best), 0)
  const avg = s.top.length ? Math.round(s.top.reduce((a, t) => a + t.rate, 0) / s.top.length) : 0

  return (
    <div>
      <PageHeader title="Статистика" subtitle={s.firstDay ? `Ваш путь с ${formatShort(s.firstDay)} ${fromKey(s.firstDay).getFullYear()}` : 'Начните отмечать привычки'} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
        <Tile emoji="✅" value={s.total} label="отметок за всё время" />
        <Tile emoji="📆" value={s.activeDays} label="активных дней" />
        <Tile emoji="⚡" value={best} label="лучшая серия" />
        <Tile emoji="🎯" value={`${avg}%`} label="средний % за 30 дней" />
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-3 lg:gap-6">
        <Card className="min-w-0 lg:col-span-2">
          <h2 className="mb-2 text-lg font-black">Выполнение плана за 30 дней</h2>
          <AreaTrend data={series} dataKey="rate" unit="%" />
        </Card>
        <Card className="min-w-0">
          <h2 className="mb-3 text-lg font-black">Рекорды</h2>
          <ul className="space-y-2 font-bold">
            <li className="flex items-center justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>🏆 Лучший день</span><span className="text-right">{s.bestDay ? `${formatShort(s.bestDay.key)} · ${s.bestDay.done}` : '—'}</span></li>
            <li className="flex items-center justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>🥇 Лучшая неделя</span><span className="text-right">{s.bestWeek ? `с ${formatShort(s.bestWeek.key)} · ${s.bestWeek.done}` : '—'}</span></li>
            <li className="flex items-center justify-between gap-2 rounded-2xl bg-white/45 px-3 py-2.5 dark:bg-white/5"><span>🌟 Лучший месяц</span><span className="text-right">{s.bestMonth ? `${formatMonth(s.bestMonth.key + '-01')} · ${s.bestMonth.done}` : '—'}</span></li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-3 lg:gap-6">
        <Card className="min-w-0">
          <h2 className="mb-2 text-lg font-black">Распределение усилий</h2>
          {s.byCategory.length ? (
            <>
              <Donut data={s.byCategory} />
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold">
                {s.byCategory.map((c) => <li key={c.id} className="flex items-center gap-1.5"><span className="ball h-3 w-3" style={{ ['--c' as string]: c.color }} />{c.icon} {c.name} · {c.value}</li>)}
              </ul>
            </>
          ) : <p className="text-soft py-10 text-center font-semibold">Нет отметок</p>}
        </Card>
        <Card className="min-w-0">
          <h2 className="mb-2 text-lg font-black">По дням недели</h2>
          <Bars data={s.byWeekday.map((d) => ({ label: d.name, value: d.value }))} dataKey="value" />
        </Card>
        <Card className="min-w-0">
          <h2 className="mb-2 text-lg font-black">По неделям</h2>
          <Bars data={weekly} dataKey="done" />
        </Card>
      </div>

      <Card className="mt-4 lg:mt-6">
        <h2 className="mb-3 text-lg font-black">Самые успешные привычки</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {s.top.map(({ habit, rate, streak }, i) => (
            <li key={habit.id}>
              <Link to={`/app/stats/${habit.id}`} className="focus-ring flex items-center gap-3 rounded-2xl bg-white/40 p-2.5 transition-transform hover:scale-[1.01] dark:bg-white/5">
                <span className="w-6 text-center text-lg font-black">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <Ball color={habit.color} size={40}>{habit.icon}</Ball>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{habit.name}</div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${rate}%`, background: `linear-gradient(180deg, color-mix(in srgb, ${habit.color} 60%, white), ${habit.color})` }} />
                  </div>
                </div>
                <div className="text-right text-sm font-black leading-tight">{rate}%<div className="text-soft text-xs">🔥 {streak.current}</div></div>
              </Link>
            </li>
          ))}
        </ul>
        {s.top.length === 0 && <p className="text-soft font-semibold">Нет активных привычек</p>}
      </Card>

      <Card className="mt-4 lg:mt-6">
        <h2 className="mb-3 text-lg font-black">Активность за всё время</h2>
        <Heatmap values={heat} today={today} />
      </Card>
    </div>
  )
}