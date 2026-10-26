import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Ball, Card, cx, EmptyState, Field, PageHeader, Segmented, Stepper, Switch, useToast } from '../components/ui'
import { WEEKDAYS_SHORT } from '../lib/date'
import { HABIT_COLORS, HABIT_ICONS } from '../lib/days'
import { scheduleText, UNITS } from '../lib/habits'
import type { Schedule, UnitKind } from '../lib/types'
import { useData } from '../store/app'

export default function HabitForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { data, today, addHabit, updateHabit } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const existing = id ? data.habits.find((h) => h.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? params.get('name') ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? params.get('icon') ?? '🎯')
  const [color, setColor] = useState(existing?.color ?? HABIT_COLORS[data.habits.length % HABIT_COLORS.length])
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? params.get('categoryId') ?? '')
  const [schedType, setSchedType] = useState<Schedule['type']>(existing?.schedule.type ?? 'daily')
  const [days, setDays] = useState<number[]>(existing?.schedule.type === 'weekdays' ? existing.schedule.days : [0, 1, 2, 3, 4])
  const [times, setTimes] = useState(existing?.schedule.type === 'perWeek' ? existing.schedule.times : 3)
  const [remind, setRemind] = useState(!!existing?.reminderTime)
  const [reminderTime, setReminderTime] = useState(existing?.reminderTime ?? '09:00')
  const [unit, setUnit] = useState<UnitKind>(existing?.unit ?? 'times')
  const [unitLabel, setUnitLabel] = useState(existing?.unitLabel ?? 'раз')
  const [amount, setAmount] = useState(String(existing?.amount ?? 1))
  const [allowedSkips, setAllowedSkips] = useState(existing?.allowedSkips ?? 2)
  const [startDate, setStartDate] = useState(existing?.createdAt ?? today)
  const [submitted, setSubmitted] = useState(false)

  if (id && !existing) {
    return <Card><EmptyState emoji="🔍" title="Привычка не найдена" text="Возможно, она была удалена." action={<Link to="/app/habits" className="btn btn-primary">К списку привычек</Link>} /></Card>
  }

  const schedule: Schedule = schedType === 'daily' ? { type: 'daily' } : schedType === 'weekdays' ? { type: 'weekdays', days: [...days].sort() } : { type: 'perWeek', times }

  const pickUnit = (k: UnitKind) => {
    const u = UNITS.find((x) => x.kind === k)!
    setUnit(k)
    setUnitLabel(u.label)
    setAmount(String(u.defaultAmount))
  }

  const amt = Number(amount.replace(',', '.'))
  const validation: Record<string, string> = {}
  if (!name.trim()) validation.name = 'Введите название привычки'
  if (schedType === 'weekdays' && days.length === 0) validation.days = 'Выберите хотя бы один день'
  if (!Number.isFinite(amt) || amt <= 0) validation.amount = 'Укажите положительное число'
  if (unit === 'custom' && !unitLabel.trim()) validation.unitLabel = 'Укажите единицу измерения'
  if (remind && !/^\d{2}:\d{2}$/.test(reminderTime)) validation.reminder = 'Укажите время'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || startDate > today) validation.startDate = 'Дата начала не может быть в будущем'
  const errors = submitted ? validation : {}

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validation).length) return

    const payload = {
      name: name.trim(),
      icon,
      color,
      categoryId: categoryId || null,
      schedule,
      reminderTime: remind ? reminderTime : null,
      unit,
      unitLabel: unitLabel.trim() || 'раз',
      amount: unit === 'times' ? 1 : amt,
      allowedSkips,
      createdAt: startDate,
    }
    if (existing) {
      updateHabit(existing.id, payload)
      toast('Изменения сохранены')
    } else {
      addHabit(payload)
      toast(`Привычка «${payload.name}» создана`)
    }
    nav('/app/habits')
  }

  return (
    <div>
      <PageHeader title={existing ? 'Редактирование' : 'Новая привычка'} subtitle={existing ? existing.name : 'Маленькие шаги — большие перемены'} />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6" noValidate>
        <div className="min-w-0 space-y-4">
          <Card className="space-y-5">
            <Field label="Название" error={errors.name}>
              <input className="field text-lg font-bold" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, «Читать 20 страниц»" maxLength={60} autoFocus={!existing} />
            </Field>
            <div>
              <span className="mb-2 block text-sm font-extrabold">Иконка</span>
              <div className="grid grid-cols-6 gap-1.5 xs:grid-cols-9 sm:grid-cols-12">
                {HABIT_ICONS.map((i) => (
                  <button key={i} type="button" onClick={() => setIcon(i)} aria-pressed={icon === i} aria-label={`Иконка ${i}`} className={cx('focus-ring grid aspect-square place-items-center rounded-xl text-xl transition-all sm:text-2xl', icon === i ? 'scale-110 bg-white shadow-[0_6px_12px_-6px_rgba(0,0,0,.5)] dark:bg-white/25' : 'hover:bg-white/40 dark:hover:bg-white/10')}>{i}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-extrabold">Цвет</span>
              <div className="flex flex-wrap items-center gap-2">
                {HABIT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Цвет ${c}`} className={cx('ball focus-ring h-9 w-9 transition-transform', color === c ? 'scale-115 ring-3 ring-white ring-offset-2 ring-offset-black/20' : 'hover:scale-110')} style={{ ['--c' as string]: c }} />
                ))}
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  🎨 Свой
                  <input type="color" className="sr-only" value={color} onChange={(e) => setColor(e.target.value)} />
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Категория">
                <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Без категории</option>
                  {data.categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </Field>
              <Field label="Дата начала" error={errors.startDate} hint="Можно указать прошлую дату, чтобы отметить прошедшие дни">
                <input type="date" className="field" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-black">Периодичность</h2>
            <Segmented value={schedType} onChange={setSchedType} options={[{ value: 'daily', label: 'Ежедневно' }, { value: 'weekdays', label: 'По дням недели' }, { value: 'perWeek', label: 'N раз в неделю' }]} />
            {schedType === 'weekdays' && (
              <div>
                <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Дни недели">
                  {WEEKDAYS_SHORT.map((d, i) => {
                    const on = days.includes(i)
                    return (
                      <button key={d} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])} className={cx('btn btn-sm !px-0', on ? 'btn-primary' : 'btn-ghost')}>{d}</button>
                    )
                  })}
                </div>
                {errors.days && <p className="mt-1 text-sm font-bold text-rose-600 dark:text-rose-400">{errors.days}</p>}
              </div>
            )}
            {schedType === 'perWeek' && (
              <div className="flex flex-wrap items-center gap-3 font-bold">
                <Stepper value={times} onChange={setTimes} min={1} max={7} label="Раз в неделю" />
                <span>раз в неделю, в любые дни</span>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-black">Единица измерения</h2>
            <Field label="Что считаем">
              <select className="field" value={unit} onChange={(e) => pickUnit(e.target.value as UnitKind)}>
                {UNITS.map((u) => <option key={u.kind} value={u.kind}>{u.title}</option>)}
              </select>
            </Field>
            {unit !== 'times' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Количество за одно выполнение" error={errors.amount}>
                  <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Подпись единицы" error={errors.unitLabel}>
                  <input className="field" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} maxLength={12} placeholder="например, «отжим.»" />
                </Field>
              </div>
            )}
            <p className="text-soft text-sm font-semibold">Единицы превращаются в «пользу» на главной: страницы — в книги, миллилитры — в литры воды, минуты — в часы.</p>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-lg font-black">Напоминание</h2>
            <Switch checked={remind} onChange={setRemind} label="Напоминать" description={data.settings.push ? 'Push-уведомление в указанное время' : 'Включите push-уведомления в профиле'} />
            {remind && (
              <Field label="Время" error={errors.reminder}>
                <input type="time" className="field" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
              </Field>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-black">Поблажки</h2>
            <p className="text-soft text-sm font-semibold">Сколько пропусков в месяц допустимо без сброса серии 🔥</p>
            <Stepper value={allowedSkips} onChange={setAllowedSkips} min={0} max={15} label="Пропусков в месяц" />
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-black">Предпросмотр</h2>
            <div className="flex items-center gap-3 rounded-2xl bg-white/50 p-3 dark:bg-white/5">
              <Ball color={color} size={52}>{icon}</Ball>
              <div className="min-w-0">
                <div className="truncate font-black">{name || 'Название привычки'}</div>
                <div className="text-soft text-sm font-semibold">{scheduleText(schedule)}{unit !== 'times' && ` · ${amount} ${unitLabel}`}{remind && ` · ⏰ ${reminderTime}`}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary flex-1 text-lg">{existing ? 'Сохранить' : 'Создать'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => nav('/app/habits')}>Отмена</button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
