import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HabitCheck } from '../components/HabitCheck'
import { LiquidProgress } from '../components/LiquidProgress'
import { Ball, Card, cx, EmptyState, Field, Modal, useToast } from '../components/ui'
import { addDays, formatLong, formatShort, fromKey, WEEKDAYS_SHORT, weekdayIndex } from '../lib/date'
import { HABIT_COLORS, HABIT_ICONS } from '../lib/days'
import { celebrate, vibrate } from '../lib/effects'
import { benefits, dayProgress, isDone, isDue, isScheduled, motivation, scheduleText, streakInfo, weekCount } from '../lib/habits'
import type { DateKey, Habit } from '../lib/types'
import { useData, type HabitInput } from '../store/app'

function greeting(h: number) {
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

const STARTER: HabitInput[] = [
  { name: 'Выпить воду', icon: '💧', color: '#2a7bff', categoryId: null, schedule: { type: 'daily' }, reminderTime: null, unit: 'glasses', unitLabel: 'стак.', amount: 8, allowedSkips: 2 },
  { name: 'Читать книгу', icon: '📚', color: '#8b3dff', categoryId: null, schedule: { type: 'daily' }, reminderTime: null, unit: 'pages', unitLabel: 'стр.', amount: 20, allowedSkips: 3 },
  { name: 'Зарядка', icon: '🏃', color: '#ff8a1f', categoryId: null, schedule: { type: 'weekdays', days: [0, 1, 2, 3, 4] }, reminderTime: null, unit: 'minutes', unitLabel: 'мин', amount: 15, allowedSkips: 2 },
  { name: 'Медитация', icon: '🧘', color: '#0e9f7e', categoryId: null, schedule: { type: 'perWeek', times: 3 }, reminderTime: null, unit: 'minutes', unitLabel: 'мин', amount: 10, allowedSkips: 1 },
]
const STARTER_CATS = ['Здоровье', 'Образование', 'Спорт', 'Здоровье']

function StreakBadge({ habit }: { habit: Habit }) {
  const { data, today } = useData()
  const s = streakInfo(habit, data.entries, today)
  if (s.current === 0) return null
  const hot = s.current >= (s.unit === 'weeks' ? 2 : 3)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-sm font-black text-slate-900 shadow-[inset_0_1px_0_#fff,0_3px_8px_-4px_rgba(0,0,0,.4)] dark:bg-white/15 dark:text-white" title="Текущая серия">
      <span className={cx(hot && 'flame')}>{s.current >= s.best && s.best >= 7 ? '⚡' : '🔥'}</span>
      {s.current}
      <span className="text-xs font-bold opacity-70">{s.unit === 'weeks' ? 'нед.' : 'дн.'}</span>
    </span>
  )
}

function DayStrip({ selected, onSelect }: { selected: DateKey; onSelect: (k: DateKey) => void }) {
  const { data, today } = useData()
  const [offset, setOffset] = useState(0)
  const end = addDays(today, -offset * 7)
  const keys = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6))
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button type="button" className="btn btn-ghost btn-icon flex-none !h-9 !min-h-9 !w-9 text-sm" aria-label="Предыдущая неделя" onClick={() => setOffset(offset + 1)}>◀</button>
      <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:gap-2">
        {keys.map((k) => {
          const p = dayProgress(data.habits, data.entries, k)
          const pct = p.total ? p.done / p.total : 0
          const active = k === selected
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSelect(k)}
              aria-pressed={active}
              aria-label={`${formatLong(k)}: ${p.done} из ${p.total}`}
              className={cx(
                'focus-ring flex min-w-0 flex-col items-center rounded-2xl py-1.5 font-extrabold transition-all',
                active ? 'bg-white text-slate-900 shadow-[0_8px_18px_-8px_rgba(0,0,0,.55),inset_0_1px_0_#fff] dark:bg-white/90' : 'hover:bg-white/40 dark:hover:bg-white/10',
              )}
            >
              <span className={cx('text-[11px] uppercase', !active && 'text-soft')}>{k === today ? 'Сег.' : WEEKDAYS_SHORT[weekdayIndex(k)]}</span>
              <span
                className="mt-0.5 grid h-8 w-8 place-items-center rounded-full text-sm"
                style={{ background: `conic-gradient(var(--accent-2) ${pct * 360}deg, rgba(127,127,127,.22) 0)` }}
              >
                <span className={cx('grid h-6 w-6 place-items-center rounded-full', active ? 'bg-white' : 'bg-[var(--glass-strong)]')}>{fromKey(k).getDate()}</span>
              </span>
            </button>
          )
        })}
      </div>
      <button type="button" className="btn btn-ghost btn-icon flex-none !h-9 !min-h-9 !w-9 text-sm" aria-label="Следующая неделя" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1))}>▶</button>
    </div>
  )
}

function ValueModal({ habit, date, onClose }: { habit: Habit; date: DateKey; onClose: () => void }) {
  const { data, setEntry } = useData()
  const [v, setV] = useState(String(data.entries[habit.id]?.[date] ?? habit.amount))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(v.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return
    setEntry(habit.id, date, n)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={`${habit.icon} ${habit.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={`Сколько за ${formatShort(date)} (${habit.unitLabel || 'ед.'})`} hint="0 — снять отметку">
          <input className="field text-2xl font-black" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} />
        </Field>
        <button className="btn btn-primary w-full">Сохранить</button>
      </form>
    </Modal>
  )
}

function HabitRow({ habit, date }: { habit: Habit; date: DateKey }) {
  const { data, toggleEntry, dayTheme, today } = useData()
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const done = isDone(data.entries, habit.id, date)
  const due = isDue(habit, data.entries, date)
  const category = data.categories.find((c) => c.id === habit.categoryId)
  const value = data.entries[habit.id]?.[date]

  const toggle = () => {
    const nowDone = toggleEntry(habit.id, date)
    vibrate()
    if (nowDone && data.settings.effects) {
      const after = dayProgress(data.habits, { ...data.entries, [habit.id]: { ...(data.entries[habit.id] ?? {}), [date]: habit.amount } }, date)
      if (after.total > 0 && after.done === after.total) {
        celebrate(dayTheme.confetti)
        toast(date === today ? 'Все привычки на сегодня выполнены! 🎉' : `День ${formatShort(date)} закрыт на 100%! 🎉`)
      }
    }
  }

  return (
    <li className={cx('pop-in flex items-center gap-3 rounded-[22px] p-2.5 pr-3 transition-colors sm:gap-4', done ? 'bg-white/55 dark:bg-white/10' : 'bg-white/25 dark:bg-white/5', !due && !done && 'opacity-60')}>
      <HabitCheck checked={done} color={habit.color} label={`${habit.name}: ${done ? 'выполнено' : 'не выполнено'}`} onToggle={toggle} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={`/app/stats/${habit.id}`} className={cx('truncate text-base font-black hover:underline sm:text-lg', done && 'line-through decoration-2 opacity-80')}>
            <span className="mr-1">{habit.icon}</span>{habit.name}
          </Link>
          <StreakBadge habit={habit} />
        </div>
        <div className="text-soft mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          {category && <span>{category.icon} {category.name}</span>}
          <span>{scheduleText(habit.schedule)}</span>
          {habit.schedule.type === 'perWeek' && <span>{weekCount(data.entries, habit, date)}/{habit.schedule.times} на неделе{!due && !done && ' ✓'}</span>}
          {habit.reminderTime && <span>⏰ {habit.reminderTime}</span>}
        </div>
      </div>
      {habit.unit !== 'times' && (
        <button type="button" onClick={() => setEdit(true)} className="focus-ring flex-none rounded-2xl bg-white/60 px-2.5 py-1.5 text-center text-sm font-black leading-tight shadow-[inset_0_1px_0_#fff] hover:bg-white/80 dark:bg-white/10" aria-label={`Изменить количество для «${habit.name}»`}>
          {done ? value : habit.amount}
          <span className="block text-[11px] font-bold opacity-70">{habit.unitLabel}</span>
        </button>
      )}
      {edit && <ValueModal habit={habit} date={date} onClose={() => setEdit(false)} />}
    </li>
  )
}

function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, addHabit } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💧')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const reset = () => { setName(''); setIcon('💧'); setCategoryId(''); setError(null) }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Введите название')
    const color = HABIT_COLORS[data.habits.length % HABIT_COLORS.length]
    addHabit({ name: name.trim(), icon, color, categoryId: categoryId || null, schedule: { type: 'daily' }, reminderTime: null, unit: 'times', unitLabel: 'раз', amount: 1, allowedSkips: 2 })
    toast(`Привычка «${name.trim()}» добавлена`)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Новая привычка">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Название" error={error}>
          <input className="field" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="Например, «Прогулка 30 минут»" maxLength={60} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-extrabold">Иконка</span>
          <div className="grid grid-cols-8 gap-1.5">
            {HABIT_ICONS.slice(0, 16).map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)} aria-pressed={icon === i} aria-label={`Иконка ${i}`} className={cx('focus-ring grid aspect-square place-items-center rounded-xl text-xl transition-all', icon === i ? 'scale-110 bg-white shadow-[0_6px_12px_-6px_rgba(0,0,0,.5)] dark:bg-white/25' : 'hover:bg-white/40 dark:hover:bg-white/10')}>{i}</button>
            ))}
          </div>
        </div>
        <Field label="Категория">
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Без категории</option>
            {data.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>
        <p className="text-soft text-sm font-semibold">Будет создана ежедневная привычка. Периодичность, напоминание и единицы можно настроить подробно.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary flex-1">Создать</button>
          <button type="button" className="btn btn-ghost flex-1" onClick={() => { const q = new URLSearchParams({ name, icon, ...(categoryId && { categoryId }) }); reset(); onClose(); nav(`/app/habits/new?${q}`) }}>Подробнее…</button>
        </div>
      </form>
    </Modal>
  )
}

const TONE: Record<string, string> = {
  party: 'from-amber-300/70 to-pink-300/60',
  up: 'from-emerald-300/60 to-sky-300/50',
  warn: 'from-orange-300/70 to-rose-300/50',
  support: 'from-sky-300/60 to-violet-300/50',
  info: 'from-white/60 to-white/30',
}

export function Today() {
  const { data, user, today, dayTheme, addHabit } = useData()
  const toast = useToast()
  const [selected, setSelected] = useState<DateKey>(today)
  const [quick, setQuick] = useState(false)
  const date = selected > today ? today : selected

  const list = useMemo(
    () => data.habits.filter((h) => !h.archived && isScheduled(h, date)).sort((a, b) => Number(isDone(data.entries, a.id, date)) - Number(isDone(data.entries, b.id, date)) || a.order - b.order),
    // порядок пересчитывается только при смене дня или набора привычек, чтобы строка не «прыгала» сразу после отметки
    [data.habits, date],
  )
  const progress = dayProgress(data.habits, data.entries, date)
  const msgs = motivation(data.habits, data.entries, today)
  const bens = benefits(data.habits, data.entries, data.categories, today)
  const active = data.habits.filter((h) => !h.archived)

  const addStarter = () => {
    STARTER.forEach((h, i) => addHabit({ ...h, categoryId: data.categories.find((c) => c.name === STARTER_CATS[i])?.id ?? null }))
    toast('Стартовый набор добавлен — начнём!')
  }

  return (
    <div>
      <header className="pop-in mb-5">
        <p className="hero-title text-sm font-extrabold uppercase tracking-wider opacity-95">{formatLong(today)} · {dayTheme.mood}</p>
        <h1 className="hero-title mt-1 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{`${greeting(new Date().getHours())}, ${user.name}!`}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-6">
        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Card className="pop-in">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-black">{date === today ? 'Прогресс дня' : `Прогресс за ${formatShort(date)}`}</h2>
                <p className="text-soft font-semibold">Выполнено <b className="text-[var(--ink)]">{progress.done}</b> из <b className="text-[var(--ink)]">{progress.total}</b> {progress.total === 1 ? 'привычки' : 'привычек'}</p>
              </div>
              <div className="text-4xl font-black tabular-nums sm:text-5xl">{progress.done}<span className="text-soft text-2xl">/{progress.total}</span></div>
            </div>
            <div className="mt-4"><LiquidProgress done={progress.done} total={progress.total} /></div>
            <div className="mt-5"><DayStrip selected={date} onSelect={setSelected} /></div>
            {date !== today && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-300/30 px-4 py-2 text-sm font-bold">
                <span>✏️ Ретро-ввод: отмечаете {formatLong(date)}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(today)}>К сегодня</button>
              </div>
            )}
          </Card>

          <Card className="pop-in">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-black">{date === today ? 'Задачи на сегодня' : `Задачи на ${formatShort(date)}`}</h2>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setQuick(true)}>＋ Привычка</button>
            </div>
            {active.length === 0 ? (
              <EmptyState
                emoji="🌱"
                title="Пока нет привычек"
                text="Начните с готового набора или создайте свою — это займёт 10 секунд."
                action={<div className="flex flex-wrap justify-center gap-2"><button type="button" className="btn btn-primary" onClick={addStarter}>Стартовый набор</button><button type="button" className="btn btn-ghost" onClick={() => setQuick(true)}>Создать свою</button></div>}
              />
            ) : list.length === 0 ? (
              <EmptyState emoji="🏖️" title="На этот день ничего не запланировано" text="Отдыхайте — или добавьте новую привычку." />
            ) : (
              <ul className="space-y-2">{list.map((h) => <HabitRow key={h.id} habit={h} date={date} />)}</ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Card className="pop-in">
            <h2 className="mb-3 text-lg font-black">Лучше, чем вчера</h2>
            <ul className="space-y-2">
              {msgs.map((m, i) => (
                <li key={i} className={cx('flex items-start gap-3 rounded-2xl bg-gradient-to-br p-3 font-bold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_6px_14px_-8px_rgba(0,0,0,.4)]', TONE[m.tone])}>
                  <span className="text-2xl leading-none drop-shadow">{m.emoji}</span>
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="pop-in">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Статистика в виде пользы</h2>
              <Link to="/app/stats" className="text-sm font-extrabold text-[var(--accent-2)] underline">Вся статистика</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {bens.map((b) => (
                <div key={b.id} className="rounded-2xl bg-white/50 p-3 shadow-[inset_0_1px_0_#fff] dark:bg-white/5 dark:shadow-none">
                  <div className="flex items-center gap-2">
                    <Ball color="#ffffff" size={34}>{b.emoji}</Ball>
                    <span className="text-soft text-xs font-extrabold leading-tight">{b.title}</span>
                  </div>
                  <div className="mt-2 text-xl font-black tabular-nums">{b.value}</div>
                  <div className="text-soft text-xs font-bold">{b.hint}</div>
                  <div className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{b.weekDelta}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setQuick(true)}
        className={cx('btn btn-primary fixed right-4 z-20 !h-16 !w-16 !p-0 text-4xl leading-none lg:bottom-8 lg:right-8', data.settings.mobileNav === 'tabs' ? 'bottom-24' : 'bottom-5')}
        aria-label="Быстро добавить привычку"
        title="Быстро добавить привычку"
      >
        ＋
      </button>
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
    </div>
  )
}
