import type { DateKey } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(now = new Date()): DateKey {
  return toKey(now)
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** 0 = понедельник … 6 = воскресенье */
export function weekdayIndex(key: DateKey): number {
  return (fromKey(key).getDay() + 6) % 7
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key))
}

export function monthKey(key: DateKey): string {
  return key.slice(0, 7)
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000)
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WEEKDAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function formatLong(key: DateKey): string {
  const d = fromKey(key)
  return `${WEEKDAYS_FULL[weekdayIndex(key)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function formatShort(key: DateKey): string {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

export function formatTiny(key: DateKey): string {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()].slice(0, 3)}`
}

export function formatMonth(key: DateKey): string {
  const d = fromKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
export const weeks = (n: number) => `${n} ${plural(n, 'неделя', 'недели', 'недель')}`
