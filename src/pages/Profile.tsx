import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Confirm, cx, Field, PageHeader, Segmented, Switch, useToast } from '../components/ui'
import * as auth from '../lib/auth'
import { plural } from '../lib/date'
import { bgUrl, DAY_THEMES } from '../lib/days'
import { requestPushPermission } from '../lib/reminders'
import { download, exportCSV, exportJSON, exportName, parseImport } from '../lib/storage'
import { nextSyncAt, SYNC_LABELS, syncAdapter } from '../lib/sync'
import type { AppData, MobileNav, SyncFrequency, ThemeMode } from '../lib/types'
import { useData } from '../store/app'

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function NavPreview({ kind, active }: { kind: MobileNav; active: boolean }) {
  return (
    <div className={cx('relative mx-auto h-28 w-16 overflow-hidden rounded-xl border-2 bg-gradient-to-b from-sky-400 to-blue-700', active ? 'border-[var(--accent)]' : 'border-white/50')} aria-hidden>
      <div className="absolute inset-x-0 top-0 flex h-4 items-center bg-white/70 px-1">
        {kind === 'burger' && <span className="text-[8px] leading-none text-slate-800">☰</span>}
      </div>
      <div className="absolute inset-x-1.5 top-6 space-y-1">
        <div className="h-3 rounded bg-white/70" /><div className="h-3 rounded bg-white/50" /><div className="h-3 rounded bg-white/50" />
      </div>
      {kind === 'tabs' && (
        <div className="absolute inset-x-1 bottom-1 flex h-4 items-center justify-around rounded-md bg-white/80">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className={cx('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-amber-500' : 'bg-slate-400')} />)}
        </div>
      )}
      {kind === 'burger' && <div className="absolute inset-y-4 left-0 w-8 bg-white/85 shadow-lg"><div className="m-1 space-y-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-1.5 rounded bg-slate-400" />)}</div></div>}
    </div>
  )
}

export default function Profile() {
  const { data, user, setUser, updateSettings, replaceData, logout, syncNow, syncError } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState({ name: user.name, login: user.login, email: user.email })
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [wipe, setWipe] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [install, setInstall] = useState<InstallPrompt | null>(null)
  const [syncing, setSyncing] = useState(false)
  const st = data.settings

  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setInstall(e as InstallPrompt) }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    try {
      setUser(await auth.updateProfile(user.id, profile))
      toast('Профиль сохранён')
    } catch (err) {
      setProfileError((err as Error).message)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    if (pwd.next !== pwd.confirm) return setPwdError('Новые пароли не совпадают')
    try {
      await auth.changePassword(user.id, pwd.current, pwd.next)
      setPwd({ current: '', next: '', confirm: '' })
      toast('Пароль изменён')
    } catch (err) {
      setPwdError((err as Error).message)
    }
  }

  const togglePush = async (v: boolean) => {
    if (!v) return updateSettings({ push: false })
    const ok = await requestPushPermission()
    if (ok) {
      updateSettings({ push: true })
      toast('Push-уведомления включены')
    } else {
      toast('Браузер не разрешил уведомления. Разрешите их в настройках сайта', 'error')
    }
  }

  const toggleEmail = (v: boolean) => {
    updateSettings({ email: v })
    if (v) {
      auth.sendMail(user.email, 'Email-оповещения включены', 'Вы будете получать еженедельную сводку о прогрессе.')
      toast('Email-оповещения включены (режим разработки: письма пишутся в консоль)', 'info')
    }
  }

  const onImport = async (file: File) => {
    try {
      setPendingImport(parseImport(await file.text()))
    } catch (err) {
      toast((err as Error).message || 'Не удалось прочитать файл', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const doSync = async () => {
    setSyncing(true)
    await syncNow()
    setSyncing(false)
  }

  const next = nextSyncAt(st.sync.frequency, st.sync.lastSyncAt)

  return (
    <div>
      <PageHeader title="Профиль и настройки" subtitle={`@${user.login} · ${user.email}`} action={<button type="button" className="btn btn-ghost" onClick={logout}>Выйти</button>} />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-black">👤 Личные данные</h2>
            {profileError && <p role="alert" className="mb-3 rounded-2xl bg-rose-500/15 px-4 py-2 font-bold text-rose-700 dark:text-rose-300">{profileError}</p>}
            <form onSubmit={saveProfile} className="space-y-3">
              <Field label="Имя (для приветствия)"><input className="field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={40} autoComplete="name" /></Field>
              <Field label="Логин"><input className="field" value={profile.login} onChange={(e) => setProfile({ ...profile, login: e.target.value })} autoComplete="username" /></Field>
              <Field label="Email"><input className="field" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} autoComplete="email" /></Field>
              <button className="btn btn-primary">Сохранить</button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-black">🔑 Смена пароля</h2>
            {pwdError && <p role="alert" className="mb-3 rounded-2xl bg-rose-500/15 px-4 py-2 font-bold text-rose-700 dark:text-rose-300">{pwdError}</p>}
            <form onSubmit={savePassword} className="space-y-3">
              <Field label="Текущий пароль"><input className="field" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} autoComplete="current-password" required /></Field>
              <Field label="Новый пароль" hint="Минимум 8 символов, буквы и цифры"><input className="field" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} autoComplete="new-password" required /></Field>
              <Field label="Повторите новый пароль"><input className="field" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" required /></Field>
              <button className="btn btn-primary">Изменить пароль</button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-black">🔔 Уведомления</h2>
            <Switch checked={st.push} onChange={togglePush} label="Push-уведомления" description="Напоминания о привычках в заданное время" />
            <Switch checked={st.email} onChange={toggleEmail} label="Email-оповещения" description="Еженедельная сводка прогресса на почту" />
            {st.push && (
              <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={async () => {
                const reg = await navigator.serviceWorker?.getRegistration()
                const opts = { body: 'Так будут выглядеть напоминания 🔥', icon: '/icons/icon-192.png' }
                if (reg) await reg.showNotification('Лучше, чем вчера', opts)
                else new Notification('Лучше, чем вчера', opts)
              }}>Отправить тестовое уведомление</button>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-black">🎨 Оформление</h2>
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-sm font-extrabold">Тема</div>
                <Segmented<ThemeMode> value={st.theme} onChange={(theme) => updateSettings({ theme })} options={[{ value: 'light', label: '☀️ Светлая' }, { value: 'dark', label: '🌙 Тёмная' }, { value: 'system', label: '🖥️ Как в системе' }]} />
              </div>
              <div>
                <div className="mb-2 text-sm font-extrabold">Мобильная навигация</div>
                <div className="grid grid-cols-2 gap-3">
                  {(['tabs', 'burger'] as MobileNav[]).map((k) => (
                    <button key={k} type="button" aria-pressed={st.mobileNav === k} onClick={() => updateSettings({ mobileNav: k })} className={cx('focus-ring rounded-2xl p-3 text-center font-extrabold transition-all', st.mobileNav === k ? 'bg-white/80 shadow-lg dark:bg-white/15' : 'bg-white/30 hover:bg-white/50 dark:bg-white/5')}>
                      <NavPreview kind={k} active={st.mobileNav === k} />
                      <div className="mt-2 text-sm">{k === 'tabs' ? 'Нижняя панель табов' : 'Боковое бургер-меню'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-extrabold">Фон</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  <button type="button" aria-pressed={st.background === 'auto'} onClick={() => updateSettings({ background: 'auto' })} className={cx('focus-ring col-span-4 rounded-xl px-2 py-2 text-sm font-extrabold sm:col-span-1', st.background === 'auto' ? 'bg-white text-slate-900 shadow' : 'bg-white/30 dark:bg-white/10')}>Авто по дню</button>
                  {DAY_THEMES.map((t, i) => (
                    <button key={t.file} type="button" aria-pressed={st.background === i} onClick={() => updateSettings({ background: i })} title={`${t.name}: ${t.mood}`} aria-label={`Фон: ${t.name}`} className={cx('focus-ring relative aspect-square overflow-hidden rounded-xl bg-cover bg-center shadow-md transition-transform hover:scale-105', st.background === i && 'ring-3 ring-[var(--accent)] ring-offset-2 ring-offset-transparent')} style={{ backgroundImage: `url(${bgUrl(i)})` }}>
                      <span className="absolute inset-x-0 bottom-0 bg-black/45 text-[10px] font-black text-white">{t.name.slice(0, 2)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-soft mt-2 text-sm font-semibold">В режиме «Авто» фон и акцентные цвета меняются каждый день недели.</p>
              </div>
              <Switch checked={st.effects} onChange={(effects) => updateSettings({ effects })} label="Живые эффекты" description="Пузырьки, параллакс, конфетти и анимации" />
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-black">☁️ Синхронизация</h2>
            <Switch checked={st.sync.enabled} onChange={(enabled) => updateSettings({ sync: { ...st.sync, enabled } })} label="Включить синхронизацию с облаком" description={st.sync.enabled ? 'Данные будут доступны на всех ваших устройствах' : 'Сейчас данные хранятся только на этом устройстве'} />
            {st.sync.enabled && (
              <div className="mt-3 space-y-3">
                <Field label="Частота обновления">
                  <select className="field" value={st.sync.frequency} onChange={(e) => updateSettings({ sync: { ...st.sync, frequency: e.target.value as SyncFrequency } })}>
                    {(Object.keys(SYNC_LABELS) as SyncFrequency[]).map((k) => <option key={k} value={k}>{SYNC_LABELS[k]}</option>)}
                  </select>
                </Field>
                <div className="rounded-2xl bg-white/40 px-4 py-3 text-sm font-semibold dark:bg-white/5">
                  <div>Последняя синхронизация: <b>{st.sync.lastSyncAt ? new Date(st.sync.lastSyncAt).toLocaleString('ru-RU') : 'ещё не было'}</b></div>
                  <div>Несинхронизированных изменений: <b>{st.sync.pendingChanges}</b></div>
                  {next && <div>Следующая: <b>{new Date(next).toLocaleString('ru-RU')}</b></div>}
                  {!syncAdapter.available && <div className="mt-2 text-amber-700 dark:text-amber-300">⚠️ Облачный сервер ещё не подключён — изменения копятся локально и будут отправлены после его подключения.</div>}
                  {syncError && syncAdapter.available && <div className="mt-2 text-rose-600">{syncError}</div>}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" disabled={syncing} onClick={doSync}>{syncing ? 'Синхронизация…' : '🔄 Синхронизировать сейчас'}</button>
                {syncError && !syncAdapter.available && <p className="text-soft text-sm font-semibold">{syncError}</p>}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-black">💾 Данные</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { download(exportName('csv'), exportCSV(data), 'text/csv;charset=utf-8'); toast('История выгружена в CSV') }}>⬇️ Экспорт CSV</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { download(exportName('json'), exportJSON(user, data), 'application/json'); toast('Резервная копия выгружена в JSON') }}>⬇️ Экспорт JSON</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>⬆️ Импорт JSON</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            </div>
            {install && (
              <button type="button" className="btn btn-primary btn-sm mt-3" onClick={async () => { await install.prompt(); setInstall(null) }}>📲 Установить приложение на устройство</button>
            )}
            <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="font-black text-rose-700 dark:text-rose-300">Опасная зона</div>
              <p className="text-soft mb-3 text-sm font-semibold">Полное удаление аккаунта, всех привычек и истории с этого устройства.</p>
              <button type="button" className="btn btn-primary btn-danger btn-sm" onClick={() => setWipe(true)}>🗑️ Удалить все данные</button>
            </div>
          </Card>
        </div>
      </div>

      <Confirm
        open={wipe}
        title="Удалить все данные?"
        text="Аккаунт, привычки, категории и вся история будут удалены безвозвратно. Рекомендуем сначала сделать экспорт в JSON."
        confirmLabel="Удалить навсегда"
        onClose={() => setWipe(false)}
        onConfirm={() => { auth.deleteAccount(user.id); logout(); nav('/', { replace: true }) }}
      />
      <Confirm
        open={!!pendingImport}
        title="Импортировать данные?"
        danger={false}
        confirmLabel="Импортировать"
        text={pendingImport ? `Текущие данные будут заменены: ${pendingImport.habits.length} ${plural(pendingImport.habits.length, 'привычка', 'привычки', 'привычек')}, ${pendingImport.categories.length} ${plural(pendingImport.categories.length, 'категория', 'категории', 'категорий')}.` : ''}
        onClose={() => setPendingImport(null)}
        onConfirm={() => { if (pendingImport) { replaceData(pendingImport); toast('Данные импортированы') } }}
      />
    </div>
  )
}
