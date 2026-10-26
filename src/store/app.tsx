import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { endSession, sessionUser } from '../lib/auth'
import { todayKey, weekdayIndex } from '../lib/date'
import { DAY_THEMES, type DayTheme } from '../lib/days'
import { KEYS, loadData, saveData, uid } from '../lib/storage'
import { isSyncDue, syncAdapter } from '../lib/sync'
import type { AppData, Category, DateKey, Habit, Settings, User } from '../lib/types'

export type HabitInput = Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived'> & { createdAt?: DateKey }

interface AppCtx {
  user: User | null
  data: AppData | null
  today: DateKey
  dayIndex: number
  dayTheme: DayTheme
  dark: boolean
  syncError: string | null
  setUser: (u: User | null) => void
  logout: () => void
  addHabit: (h: HabitInput) => Habit
  updateHabit: (id: string, patch: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  restoreHabit: (habit: Habit, history: Record<DateKey, number> | undefined) => void
  setEntry: (habitId: string, key: DateKey, value: number | null) => void
  toggleEntry: (habitId: string, key: DateKey) => boolean
  addCategory: (c: Omit<Category, 'id'>) => Category
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceData: (d: AppData) => void
  syncNow: () => Promise<void>
}

const Ctx = createContext<AppCtx | null>(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp вне AppProvider')
  return v
}

export function useData() {
  const app = useApp()
  if (!app.data || !app.user) throw new Error('Нет данных пользователя')
  return { ...app, data: app.data, user: app.user }
}

function systemDark() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => sessionUser())
  const [data, setData] = useState<AppData | null>(() => {
    const u = sessionUser()
    return u ? loadData(u.id) : null
  })
  const [today, setToday] = useState(todayKey())
  const [sysDark, setSysDark] = useState(systemDark())
  const [syncError, setSyncError] = useState<string | null>(null)
  const userRef = useRef(user)
  userRef.current = user

  useEffect(() => {
    const t = setInterval(() => setToday(todayKey()), 30000)
    const onVis = () => setToday(todayKey())
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // синхронизация между вкладками
  useEffect(() => {
    const on = (e: StorageEvent) => {
      const u = userRef.current
      if (!u) return
      if (e.key === KEYS.data(u.id)) setData(loadData(u.id))
      if (e.key === KEYS.session && !e.newValue) { setUserState(null); setData(null) }
    }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const [guestTheme, setGuestTheme] = useState<Settings['theme']>(() => (localStorage.getItem(KEYS.theme) as Settings['theme']) || 'system')
  const themeMode = data?.settings.theme ?? guestTheme
  const dark = themeMode === 'dark' || (themeMode === 'system' && sysDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const dayIndex = typeof data?.settings.background === 'number' ? data.settings.background : weekdayIndex(today)
  const dayTheme = DAY_THEMES[dayIndex]
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--accent', dayTheme.accent)
    r.setProperty('--accent-2', dayTheme.accent2)
    r.setProperty('--glow', dayTheme.glow)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dayTheme.accent2)
  }, [dayTheme])

  const commit = useCallback((fn: (d: AppData) => AppData, countsForSync = true) => {
    setData((prev) => {
      if (!prev || !userRef.current) return prev
      const next = fn(prev)
      const withMeta: AppData = {
        ...next,
        updatedAt: Date.now(),
        settings: countsForSync && next.settings.sync.enabled
          ? { ...next.settings, sync: { ...next.settings.sync, pendingChanges: next.settings.sync.pendingChanges + 1 } }
          : next.settings,
      }
      saveData(userRef.current.id, withMeta)
      return withMeta
    })
  }, [])

  const syncNow = useCallback(async () => {
    if (!data || !user) return
    try {
      await syncAdapter.push(data)
      setSyncError(null)
      commit((d) => ({ ...d, settings: { ...d.settings, sync: { ...d.settings.sync, lastSyncAt: Date.now(), pendingChanges: 0 } } }), false)
    } catch (e) {
      setSyncError((e as Error).message)
    }
  }, [data, user, commit])

  useEffect(() => {
    if (!data?.settings.sync.enabled || !syncAdapter.available) return
    const s = data.settings.sync
    if (isSyncDue(s.frequency, s.lastSyncAt, Date.now(), s.pendingChanges > 0)) void syncNow()
  }, [data, syncNow])

  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    setData(u ? loadData(u.id) : null)
    if (u && !localStorage.getItem(KEYS.data(u.id))) saveData(u.id, loadData(u.id))
  }, [])

  const logout = useCallback(() => {
    endSession()
    setGuestTheme((localStorage.getItem(KEYS.theme) as Settings['theme']) || 'system')
    setUserState(null)
    setData(null)
  }, [])

  const value = useMemo<AppCtx>(() => ({
    user, data, today, dayIndex, dayTheme, dark, syncError, setUser, logout, syncNow,
    addHabit: (input) => {
      const habit: Habit = {
        ...input,
        id: uid(),
        archived: false,
        createdAt: input.createdAt ?? today,
        order: 0,
      }
      commit((d) => ({ ...d, habits: [...d.habits, { ...habit, order: d.habits.reduce((m, h) => Math.max(m, h.order), 0) + 1 }] }))
      return habit
    },
    updateHabit: (id, patch) => commit((d) => ({ ...d, habits: d.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
    deleteHabit: (id) => commit((d) => {
      const entries = { ...d.entries }
      delete entries[id]
      return { ...d, habits: d.habits.filter((h) => h.id !== id), entries }
    }),
    restoreHabit: (habit, history) => commit((d) => {
      if (d.habits.some((h) => h.id === habit.id)) return d
      return { ...d, habits: [...d.habits, habit], entries: history ? { ...d.entries, [habit.id]: history } : d.entries }
    }),
    setEntry: (habitId, key, value) => commit((d) => {
      const map = { ...(d.entries[habitId] ?? {}) }
      if (value === null || value <= 0) delete map[key]
      else map[key] = value
      return { ...d, entries: { ...d.entries, [habitId]: map } }
    }),
    toggleEntry: (habitId, key) => {
      const h = data?.habits.find((x) => x.id === habitId)
      const was = (data?.entries[habitId]?.[key] ?? 0) > 0
      commit((d) => {
        const map = { ...(d.entries[habitId] ?? {}) }
        if (was) delete map[key]
        else map[key] = h?.amount ?? 1
        return { ...d, entries: { ...d.entries, [habitId]: map } }
      })
      return !was
    },
    addCategory: (c) => {
      const cat = { ...c, id: uid() }
      commit((d) => ({ ...d, categories: [...d.categories, cat] }))
      return cat
    },
    updateCategory: (id, patch) => commit((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    deleteCategory: (id) => commit((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      habits: d.habits.map((h) => (h.categoryId === id ? { ...h, categoryId: null } : h)),
    })),
    updateSettings: (patch) => {
      if (!data) {
        if (patch.theme) { localStorage.setItem(KEYS.theme, patch.theme); setGuestTheme(patch.theme) }
        return
      }
      commit((d) => ({ ...d, settings: { ...d.settings, ...patch } }), false)
    },
    replaceData: (next) => commit(() => next),
  }), [user, data, today, dayIndex, dayTheme, dark, syncError, setUser, logout, syncNow, commit])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
