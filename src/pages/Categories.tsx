import { useState, type FormEvent } from 'react'
import { Ball, Card, Confirm, cx, EmptyState, Field, Modal, PageHeader, useToast } from '../components/ui'
import { plural } from '../lib/date'
import { HABIT_COLORS } from '../lib/days'
import { DEFAULT_CATEGORIES } from '../lib/storage'
import type { Category } from '../lib/types'
import { useData } from '../store/app'

const CAT_ICONS = ['❤️', '💼', '🎓', '🏃', '🥗', '🏡', '🚭', '🎨', '🌙', '💰', '🧘', '👨‍👩‍👧', '🐾', '🌍', '🎵', '📌']

function CategoryModal({ initial, onClose }: { initial: Category | null; onClose: () => void }) {
  const { data, addCategory, updateCategory } = useData()
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '📌')
  const [color, setColor] = useState(initial?.color ?? HABIT_COLORS[6])
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return setError('Введите название')
    if (data.categories.some((c) => c.id !== initial?.id && c.name.toLowerCase() === n.toLowerCase())) return setError('Категория с таким названием уже есть')
    if (initial) updateCategory(initial.id, { name: n, icon, color })
    else addCategory({ name: n, icon, color })
    toast(initial ? 'Категория обновлена' : `Категория «${n}» создана`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Редактировать категорию' : 'Новая категория'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Название" error={error}>
          <input className="field" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} maxLength={30} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-extrabold">Иконка</span>
          <div className="grid grid-cols-8 gap-1.5">
            {CAT_ICONS.map((i) => (
              <button key={i} type="button" aria-pressed={icon === i} aria-label={`Иконка ${i}`} onClick={() => setIcon(i)} className={cx('focus-ring grid aspect-square place-items-center rounded-xl text-xl', icon === i ? 'bg-white shadow dark:bg-white/25' : 'hover:bg-white/40 dark:hover:bg-white/10')}>{i}</button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-extrabold">Цвет</span>
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button key={c} type="button" aria-pressed={color === c} aria-label={`Цвет ${c}`} onClick={() => setColor(c)} className={cx('ball focus-ring h-8 w-8', color === c && 'ring-3 ring-white ring-offset-2 ring-offset-black/20')} style={{ ['--c' as string]: c }} />
            ))}
          </div>
        </div>
        <button className="btn btn-primary w-full">{initial ? 'Сохранить' : 'Создать'}</button>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const { data, deleteCategory, addCategory } = useData()
  const toast = useToast()
  const [editing, setEditing] = useState<Category | null | 'new'>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const count = (id: string) => data.habits.filter((h) => h.categoryId === id).length
  const missingDefaults = DEFAULT_CATEGORIES.filter((d) => !data.categories.some((c) => c.name === d.name))

  return (
    <div>
      <PageHeader title="Категории" subtitle="Группируйте привычки по сферам жизни" action={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>＋ Категория</button>} />
      {data.categories.length === 0 ? (
        <Card><EmptyState emoji="🗂️" title="Категорий нет" action={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>Создать</button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.categories.map((c) => (
            <Card key={c.id} as="article" className="pop-in flex items-center gap-3 !p-4">
              <Ball color={c.color} size={48}>{c.icon}</Ball>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-black">{c.name}</h3>
                <p className="text-soft text-sm font-semibold">{count(c.id)} {plural(count(c.id), 'привычка', 'привычки', 'привычек')}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Изменить ${c.name}`} onClick={() => setEditing(c)}>✏️</button>
              <button type="button" className="btn btn-ghost btn-icon" aria-label={`Удалить ${c.name}`} onClick={() => setToDelete(c)}>🗑️</button>
            </Card>
          ))}
        </div>
      )}
      {missingDefaults.length > 0 && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold">Не хватает стандартных: {missingDefaults.map((d) => d.name).join(', ')}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { missingDefaults.forEach((d) => addCategory(d)); toast('Стандартные категории восстановлены') }}>Восстановить</button>
        </Card>
      )}
      {editing && <CategoryModal initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <Confirm
        open={!!toDelete}
        title="Удалить категорию?"
        text={toDelete && count(toDelete.id) > 0 ? `${count(toDelete.id)} ${plural(count(toDelete.id), 'привычка останется', 'привычки останутся', 'привычек останутся')} без категории — сами привычки и их история не пострадают.` : 'Категория будет удалена.'}
        onClose={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) { deleteCategory(toDelete.id); toast(`Категория «${toDelete.name}» удалена`) } }}
      />
    </div>
  )
}
