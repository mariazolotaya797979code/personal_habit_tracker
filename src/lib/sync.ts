import type { AppData, SyncFrequency } from './types'

export const SYNC_LABELS: Record<SyncFrequency, string> = {
  auto: 'Автоматически',
  daily: '1 раз в день',
  weekly: '1 раз в неделю',
  monthly: '1 раз в месяц',
}

const PERIOD: Record<Exclude<SyncFrequency, 'auto'>, number> = {
  daily: 86400000,
  weekly: 7 * 86400000,
  monthly: 30 * 86400000,
}

/** Пора ли синхронизироваться: «авто» — при каждом изменении, иначе раз в выбранный период. */
export function isSyncDue(frequency: SyncFrequency, lastSyncAt: number | null, now: number, hasChanges: boolean): boolean {
  if (!hasChanges) return false
  if (frequency === 'auto' || lastSyncAt === null) return true
  return now - lastSyncAt >= PERIOD[frequency]
}

export function nextSyncAt(frequency: SyncFrequency, lastSyncAt: number | null): number | null {
  if (frequency === 'auto' || lastSyncAt === null) return null
  return lastSyncAt + PERIOD[frequency]
}

export interface SyncAdapter {
  readonly available: boolean
  push(data: AppData): Promise<void>
}

/** Сервер синхронизации пока не подключён: данные остаются на устройстве, изменения копятся до подключения. */
export const syncAdapter: SyncAdapter = {
  available: false,
  async push() {
    throw new Error('Облачный сервер ещё не подключён. Данные надёжно сохранены на этом устройстве.')
  },
}
