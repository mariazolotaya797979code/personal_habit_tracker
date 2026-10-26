import { Suspense, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useReminders } from '../lib/reminders'
import { useApp } from '../store/app'
import { Background } from './Background'
import { Logo } from './Logo'
import { cx, Loading } from './ui'

export const NAV = [
  { to: '/app', label: 'Сегодня', icon: '☀️', end: true, tab: true },
  { to: '/app/habits', label: 'Привычки', icon: '🎯', tab: true },
  { to: '/app/calendar', label: 'Календарь', icon: '📅', tab: true },
  { to: '/app/stats', label: 'Статистика', icon: '📊', tab: true },
  { to: '/app/categories', label: 'Категории', icon: '🗂️', tab: false },
  { to: '/app/profile', label: 'Профиль', icon: '👤', tab: true },
]

function ThemeQuickToggle({ className }: { className?: string }) {
  const { dark, updateSettings } = useApp()
  return (
    <button
      type="button"
      className={cx('btn btn-ghost btn-icon text-lg', className)}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
    >
      {dark ? '🌞' : '🌙'}
    </button>
  )
}

function NavItem({ item, onClick, compact }: { item: (typeof NAV)[number]; onClick?: () => void; compact?: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          'focus-ring group flex items-center gap-3 rounded-2xl px-3 py-2.5 font-extrabold transition-all',
          compact && 'flex-col gap-0.5 px-1 py-1.5 text-[11px]',
          isActive ? 'bg-white/80 text-slate-900 shadow-[0_8px_20px_-10px_rgba(0,0,0,.5),inset_0_1px_0_#fff] dark:bg-white/15 dark:text-white' : 'hover:bg-white/40 dark:hover:bg-white/10',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cx('grid place-items-center rounded-full transition-transform', compact ? 'h-8 w-8 text-xl' : 'h-9 w-9 text-xl', isActive ? 'scale-110 drop-shadow-[0_4px_6px_rgba(0,0,0,.3)]' : 'group-hover:scale-110')}>
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function AppLayout() {
  const { user, data, dayTheme, dayIndex, logout } = useApp()
  const [drawer, setDrawer] = useState(false)
  const loc = useLocation()
  useReminders()

  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0 }) }, [loc.pathname])
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-effects', data ? !data.settings.effects : false)
  }, [data])

  if (!user || !data) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  const mode = data.settings.mobileNav

  return (
    <div className="min-h-dvh">
      <Background index={dayIndex} effects={data.settings.effects} />

      {/* Десктоп: боковая панель */}
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-[17.5rem] flex-col overflow-y-auto no-scrollbar rounded-[30px] p-4 lg:flex">
        <Link to="/app" className="mb-6 px-2 pt-1"><Logo /></Link>
        <nav className="flex flex-col gap-1" aria-label="Основная навигация">
          {NAV.map((n) => <NavItem key={n.to} item={n} />)}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-white/40 p-3 text-sm dark:bg-white/5">
            <div className="font-black">{dayTheme.name}</div>
            <div className="text-soft font-semibold">{dayTheme.mood}</div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeQuickToggle />
            <button type="button" className="btn btn-ghost flex-1" onClick={logout}>Выйти</button>
          </div>
        </div>
      </aside>

      {/* Мобильные и планшеты: верхняя панель */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between gap-2 rounded-b-[24px] px-3 py-2 [padding-top:max(.5rem,env(safe-area-inset-top))] lg:hidden">
        {mode === 'burger' ? (
          <button type="button" className="btn btn-ghost btn-icon text-xl" aria-label="Открыть меню" aria-expanded={drawer} onClick={() => setDrawer(true)}>☰</button>
        ) : <span className="w-11" />}
        <Link to="/app" className="min-w-0"><Logo compact /></Link>
        <ThemeQuickToggle />
      </header>

      {mode === 'burger' && drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <div className="fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <nav className="glass-strong slide-in-left absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col rounded-r-[30px] p-4 [padding-top:max(1rem,env(safe-area-inset-top))]" aria-label="Основная навигация">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Закрыть меню" onClick={() => setDrawer(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-1">{NAV.map((n) => <NavItem key={n.to} item={n} />)}</div>
            <div className="mt-auto rounded-2xl bg-white/40 p-3 text-sm dark:bg-white/5">
              <div className="font-black">{dayTheme.name}</div>
              <div className="text-soft font-semibold">{dayTheme.mood}</div>
            </div>
            <button type="button" className="btn btn-ghost mt-3" onClick={logout}>Выйти</button>
          </nav>
        </div>
      )}

      <main className={cx('w-full px-3 pt-4 sm:px-5 lg:pl-[20.5rem] lg:pr-8 lg:pt-8', mode === 'tabs' ? 'pb-28 lg:pb-10' : 'pb-10')}>
        <div className="mx-auto w-full max-w-[1440px]">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {mode === 'tabs' && (
        <nav className="glass fixed inset-x-2 bottom-2 z-30 grid grid-cols-5 gap-1 rounded-[26px] p-1.5 [padding-bottom:max(.375rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Нижняя навигация">
          {NAV.filter((n) => n.tab).map((n) => <NavItem key={n.to} item={n} compact />)}
        </nav>
      )}
    </div>
  )
}
