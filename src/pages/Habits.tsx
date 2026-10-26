import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ball, Card, Confirm, cx, EmptyState, PageHeader, Segmented, useToast } from '../components/ui'
import { plural } from '../lib/date'
import { completionRate, scheduleText, streakInfo } from '../lib/habits'
import type { Habit } from '../lib/types'
import { useData } from '../store/app'

function HabitCard({ habit, onDelete }: { habit: Habit; onDelete: () => void }) {
  const { data, today, updateHabit } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const s = streakInfo(habit, data.entries, today)
  const rate = completionRate(habit, data.entries, today, 30)
  const category = data.categories.find((c) => c.id === habit.categoryId)
  const unit = s.unit === 'weeks' ? plural(s.current, 'неделя', 'недели', 'недель') : plural(s.current, 'день', 'дня', 'дней')

  const toggleArchive = () => {
    updateHabit(habit.id, { archived: !habit.archived })
    toast(habit.archived ? `«${habit.name}» снова активна` : `«${habit.name}» перенесена в архив`, 'success', { label: 'Отменить', run: () => updateHabit(habit.id, { archived: habit.archived }) })
  }

  return (
    <Card as="article" className="pop-in flex flex-col !p-4 sm:!p-5">
      <div className="flex items-start gap-3">
        <Ball color={habit.color} size={52}>{habit.icon}</Ball>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black">{habit.name}</h3>
          <p className="text-soft text-sm font-semibold">{scheduleText(habit.schedule)}{category && ` · ${category.icon} ${category.name}`}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white/50 p-2 dark:bg-white/5">
          <div className="text-3xl font-black tabular-nums leading-none"><span className={cx(s.current >= 3 && 'flame')}>🔥</span>{s.current}</div>
          <div className="text-soft mt-1 text-[11px] font-extrabold">{unit} подряд</div>
        </div>
        <div className="rounded-2xl bg-white/50 p-2 dark:bg-white/5">
          <div className="text-3xl font-black tabular-nums leading-none">⚡{s.best}</div>
          <div className="text-soft mt-1 text-[11px] font-extrabold">рекорд</div>
        </div>
        <div className="rounded-2xl bg-white/50 p-2 dark:bg-white/5">
          <div className="text-3xl font-black tabular-nums leading-none">{rate}<span className="text-lg">%</span></div>
          <div className="text-soft mt-1 text-[11px] font-extrabold">за 30 дней</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/35 px-3 py-2 text-sm font-bold dark:bg-white/5" title="Легальные пропуски не прерывают серию">
        <span aria-hidden>🛟</span>
        {habit.allowedSkips === 0 ? (
          <span>Пропуски без сброса серии не предусмотрены</span>
        ) : (
          <span className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <span>Осталось легальных пропусков: <b>{s.skipsLeft}</b> из {habit.allowedSkips} в этом месяце</span>
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: Math.min(habit.allowedSkips, 10) }, (_, i) => (
                <span key={i} className={cx('h-3 w-3 rounded-full', i < s.skipsLeft ? 'ball' : 'bg-black/15 dark:bg-white/15')} style={{ ['--c' as string]: '#2a7bff' }} />
              ))}
            </span>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/app/habits/${habit.id}/edit`)}>✏️ Изменить</button>
        <Link to={`/app/stats/${habit.id}`} className="btn btn-ghost btn-sm">📊 Статистика</Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggleArchive}>{habit.archived ? '♻️ Вернуть' : '🗄️ В архив'}</button>
        <button type="button" className="btn btn-ghost btn-sm text-rose-600 dark:text-rose-400" onClick={onDelete}>🗑️ Удалить</button>
      </div>
    </Card>
  )
}

export default function Habits() {
  const { data, deleteHabit, restoreHabit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [cat, setCat] = useState<string>('all')
  const [toDelete, setToDelete] = useState<Habit | null>(null)

  const list = data.habits
    .filter((h) => (tab === 'active' ? !h.archived : h.archived))
    .filter((h) => cat === 'all' || (cat === 'none' ? !h.categoryId : h.categoryId === cat))
    .sort((a, b) => a.order - b.order)
  const counts = { active: data.habits.filter((h) => !h.archived).length, archived: data.habits.filter((h) => h.archived).length }
  const usedCats = data.categories.filter((c) => data.habits.some((h) => h.categoryId === c.id))

  return (
    <div>
      <PageHeader title="Привычки" subtitle="Серии, пропуски и управление" action={<Link to="/app/habits/new" className="btn btn-primary">＋ Новая привычка</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: `Активные · ${counts.active}` }, { value: 'archived', label: `Архив · ${counts.archived}` }]} className="glass" />
        <Link to="/app/categories" className="btn btn-ghost btn-sm">🗂️ Категории</Link>
      </div>
      {usedCats.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Фильтр по категориям">
          {[{ id: 'all', name: 'Все', icon: '✨' }, ...usedCats, { id: 'none', name: 'Без категории', icon: '📌' }].map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={cx('btn btn-sm', cat === c.id ? 'btn-primary' : 'btn-ghost')}>{c.icon} {c.name}</button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Card>
          {tab === 'active' ? (
            <EmptyState emoji="🎯" title="Нет активных привычек" text={cat === 'all' ? 'Создайте первую — и серия начнётся уже сегодня.' : 'В этой категории пока пусто.'} action={<Link to="/app/habits/new" className="btn btn-primary">Создать привычку</Link>} />
          ) : (
            <EmptyState emoji="🗄️" title="Архив пуст" text="Сюда попадают привычки, которые вы поставили на паузу. История при этом сохраняется." />
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((h) => <HabitCard key={h.id} habit={h} onDelete={() => setToDelete(h)} />)}
        </div>
      )}

      <Confirm
        open={!!toDelete}
        title="Удалить привычку?"
        text={<>Привычка «{toDelete?.name}» и вся история её выполнения будут удалены. Отменить удаление можно сразу в уведомлении. Если хотите сохранить историю — перенесите её в архив.</>}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return
          const habit = toDelete
          const history = data.entries[habit.id]
          deleteHabit(habit.id)
          toast(`«${habit.name}» удалена`, 'success', { label: 'Отменить', run: () => restoreHabit(habit, history) })
        }}
      />
    </div>
  )
}
