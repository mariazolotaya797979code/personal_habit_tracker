import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Background } from '../components/Background'
import { HabitCheck, Smiley } from '../components/HabitCheck'
import { Heatmap, type HeatValue } from '../components/Heatmap'
import { LiquidProgress } from '../components/LiquidProgress'
import { Logo } from '../components/Logo'
import { Card, cx } from '../components/ui'
import { registrationOpen } from '../lib/auth'
import { addDays } from '../lib/date'
import { DAY_THEMES } from '../lib/days'
import type { DateKey } from '../lib/types'
import { useApp } from '../store/app'

export const CONTACTS = {
  email: 'hello@habit-tracker.local',
  telegram: '@habit_tracker',
  phone: '+7 (900) 000-00-00',
}

const STEPS = [
  { emoji: '🎯', title: 'Задайте привычку', text: 'Название, иконка, цвет, периодичность и единица измерения — за пару касаний.' },
  { emoji: '🫧', title: 'Отмечайте каждый день', text: 'Нажмите на пузырёк — он превратится в улыбающийся шарик. Забыли вчера? Отметьте задним числом.' },
  { emoji: '🔥', title: 'Растите серии', text: 'Серии и рекорды мотивируют не прерывать цепочку, а «легальные» пропуски спасают от срывов.' },
  { emoji: '📈', title: 'Смотрите на пользу', text: 'Страницы превращаются в книги, стаканы — в литры воды, минуты — в часы, вложенные в себя.' },
]

const FEATURES = [
  { emoji: '☀️', title: 'Дашборд «Сегодня»', text: 'Прогресс дня, список задач и быстрое добавление.' },
  { emoji: '💬', title: '«Лучше, чем вчера»', text: 'Мягкие подсказки о динамике и поддержка при пропусках.' },
  { emoji: '📅', title: 'Календарь и история', text: 'Тепловая карта активности и исправление прошлых дней.' },
  { emoji: '📊', title: 'Глубокая аналитика', text: 'Проценты за 7/15/30 дней, лучшие дни, недели и месяцы.' },
  { emoji: '🗂️', title: 'Категории', text: 'Здоровье, работа, спорт, сон и любые свои.' },
  { emoji: '⏰', title: 'Напоминания', text: 'Push-уведомления в нужное время.' },
  { emoji: '🌗', title: 'Светлая и тёмная тема', text: 'И новый живой фон на каждый день недели.' },
  { emoji: '📲', title: 'Как приложение', text: 'Устанавливается на телефон и работает офлайн (PWA).' },
]

const ADVANTAGES = [
  { emoji: '🔒', title: 'Только для вас', text: 'Закрытое персональное приложение: без соцсетей, рейтингов и чужих глаз.' },
  { emoji: '🧘', title: 'Без лишнего шума', text: 'Никакой рекламы и бесконечных лент — только ваши привычки и ваш прогресс.' },
  { emoji: '🎨', title: 'Под себя', text: 'Свои иконки, цвета, единицы, расписания и поблажки для каждой привычки.' },
  { emoji: '💾', title: 'Ваши данные — ваши', text: 'Хранение на устройстве, экспорт в CSV/JSON и синхронизация по желанию.' },
]

const DEMO = [
  { id: 'w', name: 'Выпить 8 стаканов воды', icon: '💧', color: '#2a7bff', streak: 12 },
  { id: 'r', name: 'Читать 20 страниц', icon: '📚', color: '#8b3dff', streak: 7 },
  { id: 's', name: 'Зарядка 15 минут', icon: '🏃', color: '#ff8a1f', streak: 4 },
  { id: 'm', name: 'Медитация', icon: '🧘', color: '#0e9f7e', streak: 21 },
]

function DemoDashboard() {
  const { today } = useApp()
  const [done, setDone] = useState<Record<string, boolean>>({ w: true, m: true })
  const count = DEMO.filter((d) => done[d.id]).length
  const heat = useMemo(() => {
    const out: Record<DateKey, HeatValue> = {}
    let seed = 3
    for (let i = 0; i < 370; i++) {
      seed = (seed * 16807) % 2147483647
      const r = seed / 2147483647
      out[addDays(today, -i)] = { done: Math.floor(r * 5), total: 4 }
    }
    return out
  }, [today])
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="min-w-0">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-lg font-black">Прогресс дня</div>
            <div className="text-soft font-semibold">Выполнено {count} из {DEMO.length}</div>
          </div>
          <div className="text-4xl font-black">{count}<span className="text-soft text-2xl">/{DEMO.length}</span></div>
        </div>
        <div className="mt-4"><LiquidProgress done={count} total={DEMO.length} /></div>
        <ul className="mt-4 space-y-2">
          {DEMO.map((d) => (
            <li key={d.id} className={cx('flex items-center gap-3 rounded-[22px] p-2.5', done[d.id] ? 'bg-white/55 dark:bg-white/10' : 'bg-white/25 dark:bg-white/5')}>
              <HabitCheck checked={!!done[d.id]} color={d.color} label={d.name} onToggle={() => setDone({ ...done, [d.id]: !done[d.id] })} />
              <span className="min-w-0 flex-1 truncate font-black">{d.icon} {d.name}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-sm font-black text-slate-900 dark:bg-white/15 dark:text-white"><span className="flame">🔥</span>{d.streak + (done[d.id] ? 1 : 0)}</span>
            </li>
          ))}
        </ul>
        <p className="text-soft mt-3 text-center text-sm font-bold">Попробуйте — нажмите на пузырёк 👆</p>
      </Card>
      <div className="min-w-0 space-y-4">
        <Card>
          <div className="mb-3 text-lg font-black">Лучше, чем вчера</div>
          <div className="space-y-2 font-bold text-slate-900">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-300/60 to-sky-300/50 p-3">🚀 Уже лучше, чем вчера: {count}/4 против 2/4.</div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-300/70 to-pink-300/60 p-3">🔥 «Медитация»: ты держишься дольше на 5 дней, чем в прошлый раз!</div>
          </div>
        </Card>
        <Card>
          <div className="mb-3 text-lg font-black">Тепловая карта</div>
          <Heatmap values={heat} today={today} maxWeeks={26} />
        </Card>
      </div>
    </div>
  )
}

export function Landing() {
  const { user, dayIndex, dayTheme, dark, updateSettings } = useApp()
  const open = registrationOpen()
  const cta = user ? { to: '/app', label: 'Открыть приложение' } : open ? { to: '/register', label: 'Начать бесплатно' } : { to: '/login', label: 'Войти' }

  const toggleTheme = () => updateSettings({ theme: dark ? 'light' : 'dark' })

  return (
    <div className="min-h-dvh">
      <Background index={dayIndex} />
      <header className="glass sticky top-2 z-30 mx-2 mt-2 flex items-center justify-between gap-2 rounded-full px-3 py-2 sm:mx-4 sm:px-5">
        <Link to="/" className="min-w-0"><Logo compact /></Link>
        <nav className="hidden items-center gap-1 font-extrabold md:flex" aria-label="Разделы">
          <a href="#how" className="rounded-full px-3 py-2 hover:bg-white/40 dark:hover:bg-white/10">Как это работает</a>
          <a href="#features" className="rounded-full px-3 py-2 hover:bg-white/40 dark:hover:bg-white/10">Возможности</a>
          <a href="#demo" className="rounded-full px-3 py-2 hover:bg-white/40 dark:hover:bg-white/10">Дашборд</a>
          <a href="#why" className="rounded-full px-3 py-2 hover:bg-white/40 dark:hover:bg-white/10">Преимущества</a>
        </nav>
        <div className="flex flex-none items-center gap-2">
          <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Сменить тему">{dark ? '🌞' : '🌙'}</button>
          {user ? <Link to="/app" className="btn btn-primary btn-sm">В приложение</Link> : <Link to="/login" className="btn btn-primary btn-sm">Войти</Link>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 sm:px-6">
        <section className="grid items-center gap-8 py-14 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:py-28">
          <div className="pop-in">
            <span className="glass inline-block rounded-full px-4 py-1.5 text-sm font-black">{dayTheme.name} · {dayTheme.mood} ✨</span>
            <h1 className="hero-title mt-5 text-4xl font-black leading-[1.05] sm:text-6xl xl:text-7xl">Каждый день — немного лучше, чем вчера</h1>
            <p className="mt-5 max-w-xl text-lg font-bold text-white/95 [text-shadow:0_2px_12px_rgba(0,30,80,.7)] sm:text-xl">
              Персональный трекер привычек, который помогает выстроить дисциплину, укрепить полезные привычки и видеть свой прогресс — ярко, наглядно и с улыбкой.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cta.to} className="btn btn-primary px-7 text-lg">{cta.label}</Link>
              <a href="#demo" className="btn btn-ghost px-7 text-lg">Посмотреть дашборд</a>
            </div>
          </div>
          <div className="relative mx-auto hidden h-[420px] w-full max-w-md sm:block" aria-hidden>
            {[
              { c: '#ffc21a', s: 190, x: '14%', y: '4%', d: '0s' },
              { c: '#ff4d4d', s: 150, x: '55%', y: '22%', d: '-1.3s' },
              { c: '#6ccb2f', s: 120, x: '8%', y: '55%', d: '-2.1s' },
              { c: dayTheme.accent, s: 170, x: '48%', y: '58%', d: '-0.7s' },
            ].map((b, i) => (
              <span key={i} className="ball bob absolute" style={{ ['--c' as string]: b.c, width: b.s, height: b.s, left: b.x, top: b.y, animationDelay: b.d }}>
                <Smiley className="absolute inset-0 h-full w-full" />
              </span>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24 py-10">
          <h2 className="hero-title mb-6 text-3xl font-black sm:text-4xl">Как это работает</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Card className="h-full">
                  <div className="flex items-center gap-3">
                    <span className="ball grid h-11 w-11 place-items-center text-lg font-black text-slate-900" style={{ ['--c' as string]: DAY_THEMES[i].accent }}>{i + 1}</span>
                    <span className="text-3xl">{s.emoji}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-black">{s.title}</h3>
                  <p className="text-soft mt-1 font-semibold">{s.text}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="scroll-mt-24 py-10">
          <h2 className="hero-title mb-6 text-3xl font-black sm:text-4xl">Ключевые возможности</h2>
          <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full !p-5">
                <div className="text-4xl drop-shadow-[0_6px_8px_rgba(0,0,0,.25)]">{f.emoji}</div>
                <h3 className="mt-3 text-lg font-black">{f.title}</h3>
                <p className="text-soft mt-1 text-sm font-semibold">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="demo" className="scroll-mt-24 py-10">
          <h2 className="hero-title mb-2 text-3xl font-black sm:text-4xl">Пример дашборда</h2>
          <p className="mb-6 font-bold text-white/95 [text-shadow:0_2px_10px_rgba(0,30,80,.7)]">Живой интерактивный макет — так выглядит ваш день в приложении.</p>
          <DemoDashboard />
        </section>

        <section id="why" className="scroll-mt-24 py-10">
          <h2 className="hero-title mb-6 text-3xl font-black sm:text-4xl">Преимущества</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ADVANTAGES.map((a) => (
              <Card key={a.title} className="flex items-start gap-4">
                <span className="text-4xl">{a.emoji}</span>
                <div>
                  <h3 className="text-xl font-black">{a.title}</h3>
                  <p className="text-soft mt-1 font-semibold">{a.text}</p>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to={cta.to} className="btn btn-primary px-8 text-lg">{cta.label}</Link>
          </div>
        </section>
      </main>

      <footer className="glass mx-2 mb-2 mt-10 rounded-[30px] px-5 py-8 sm:mx-4">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          <div>
            <Logo />
            <p className="text-soft mt-3 text-sm font-semibold">Персональный трекер привычек. Сделано с заботой о вашей дисциплине.</p>
          </div>
          <div>
            <h3 className="font-black">Контакты</h3>
            <ul className="text-soft mt-2 space-y-1 font-semibold">
              <li>✉️ <a className="underline" href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a></li>
              <li>💬 Telegram: {CONTACTS.telegram}</li>
              <li>📞 <a className="underline" href={`tel:${CONTACTS.phone.replace(/[^+\d]/g, '')}`}>{CONTACTS.phone}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-black">Навигация</h3>
            <ul className="text-soft mt-2 space-y-1 font-semibold">
              <li><Link className="underline" to="/login">Вход</Link></li>
              {open && <li><Link className="underline" to="/register">Регистрация</Link></li>}
              <li><a className="underline" href="#features">Возможности</a></li>
            </ul>
          </div>
        </div>
        <p className="text-soft mt-6 text-center text-sm font-bold">© {new Date().getFullYear()} «Лучше, чем вчера»</p>
      </footer>
    </div>
  )
}
