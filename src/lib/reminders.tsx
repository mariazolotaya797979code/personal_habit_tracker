import { useEffect, useRef } from 'react'
import { useToast } from '../components/ui'
import { useApp } from '../store/app'
import { todayKey } from './date'
import { isDone, isDue } from './habits'

const sentKey = (date: string) => `pht:notified:${date}`

export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

async function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: title })
    else new Notification(title, { body, icon: '/icons/icon-192.png' })
    return true
  } catch {
    return false
  }
}

/** Напоминания работают, пока приложение открыто (или установлено как PWA и активно). */
export function useReminders() {
  const { data } = useApp()
  const toast = useToast()
  const ref = useRef(data)
  ref.current = data

  useEffect(() => {
    const tick = () => {
      const d = ref.current
      if (!d || !d.settings.push) return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = todayKey(now)
      const sent: string[] = JSON.parse(localStorage.getItem(sentKey(today)) || '[]')
      for (const h of d.habits) {
        if (h.archived || !h.reminderTime || h.reminderTime > hhmm || sent.includes(h.id)) continue
        if (!isDue(h, d.entries, today) || isDone(d.entries, h.id, today)) continue
        // не напоминаем о времени, прошедшем более 30 минут назад (например, при открытии вечером)
        const [rh, rm] = h.reminderTime.split(':').map(Number)
        if (now.getHours() * 60 + now.getMinutes() - (rh * 60 + rm) > 30) { sent.push(h.id); continue }
        sent.push(h.id)
        const title = `${h.icon} ${h.name}`
        const body = 'Время для привычки! Отметь выполнение, чтобы не прерывать серию 🔥'
        void notify(title, body)
        toast(<span><b>{title}</b> — пора выполнить!</span>, 'info')
      }
      localStorage.setItem(sentKey(today), JSON.stringify(sent))
    }
    tick()
    const t = setInterval(tick, 20000)
    return () => clearInterval(t)
  }, [toast])
}
