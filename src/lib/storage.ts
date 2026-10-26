import { todayKey } from './date'
import type { AppData, Category, Settings, User } from './types'

export const KEYS = {
  users: 'pht:users',
  session: 'pht:session',
  theme: 'pht:theme',
  reset: 'pht:reset',
  outbox: 'pht:outbox',
  data: (userId: string) => `pht:data:${userId}`,
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Здоровье', icon: '❤️', color: '#ff4d5e' },
  { name: 'Работа', icon: '💼', color: '#2a7bff' },
  { name: 'Образование', icon: '🎓', color: '#8b3dff' },
  { name: 'Спорт', icon: '🏃', color: '#ff8a1f' },
  { name: 'Питание', icon: '🥗', color: '#4cbf2a' },
  { name: 'Дом', icon: '🏡', color: '#12b5c9' },
  { name: 'Вредные привычки', icon: '🚭', color: '#6b7280' },
  { name: 'Творчество', icon: '🎨', color: '#ff3d9a' },
  { name: 'Сон', icon: '🌙', color: '#4f46e5' },
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  mobileNav: 'tabs',
  push: false,
  email: false,
  effects: true,
  background: 'auto',
  sync: { enabled: false, frequency: 'auto', lastSyncAt: null, pendingChanges: 0 },
}

export function createInitialData(): AppData {
  return {
    version: 1,
    habits: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, id: uid() })),
    entries: {},
    settings: { ...DEFAULT_SETTINGS, theme: (localStorage.getItem(KEYS.theme) as Settings['theme']) || 'system' },
    updatedAt: Date.now(),
  }
}

export function loadData(userId: string): AppData {
  const data = readJSON<AppData | null>(KEYS.data(userId), null)
  if (!data) return createInitialData()
  return normalizeData(data)
}

export function normalizeData(data: Partial<AppData>): AppData {
  const base = createInitialData()
  return {
    version: 1,
    habits: Array.isArray(data.habits) ? data.habits : [],
    categories: Array.isArray(data.categories) ? data.categories : base.categories,
    entries: data.entries && typeof data.entries === 'object' ? data.entries : {},
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}), sync: { ...DEFAULT_SETTINGS.sync, ...(data.settings?.sync ?? {}) } },
    updatedAt: data.updatedAt ?? Date.now(),
  }
}

export function saveData(userId: string, data: AppData) {
  writeJSON(KEYS.data(userId), data)
  localStorage.setItem(KEYS.theme, data.settings.theme)
}

export function exportJSON(user: User, data: AppData): string {
  const { passwordHash: _p, salt: _s, ...profile } = user
  return JSON.stringify({ app: 'personal-habit-tracker', exportedAt: new Date().toISOString(), profile, data }, null, 2)
}

export function parseImport(text: string): AppData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён или это не JSON')
  }
  const data = ((parsed as { data?: unknown } | null)?.data ?? parsed) as AppData | null
  if (!data || !Array.isArray(data.habits) || typeof data.entries !== 'object') throw new Error('Файл не похож на экспорт трекера')
  return normalizeData(data)
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCSV(data: AppData): string {
  const header = ['Дата', 'Привычка', 'Категория', 'Значение', 'Единица', 'Архив']
  const rows: (string | number)[][] = []
  for (const h of data.habits) {
    const cat = data.categories.find((c) => c.id === h.categoryId)?.name ?? ''
    for (const [k, v] of Object.entries(data.entries[h.id] ?? {})) {
      if (v > 0) rows.push([k, h.name, cat, v, h.unitLabel, h.archived ? 'да' : 'нет'])
    }
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const exportName = (ext: string) => `habits-${todayKey()}.${ext}`
