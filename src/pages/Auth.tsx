import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Background } from '../components/Background'
import { Logo } from '../components/Logo'
import { Field, useToast } from '../components/ui'
import * as auth from '../lib/auth'
import { useApp } from '../store/app'

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { dayIndex } = useApp()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-3 py-8">
      <Background index={dayIndex} />
      <Link to="/" className="mb-6 rounded-full bg-white/70 px-4 py-2 backdrop-blur-md dark:bg-slate-900/60"><Logo /></Link>
      <div className="glass-strong glass-sheen pop-in w-full max-w-md rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-black">{title}</h1>
        {subtitle && <p className="text-soft mt-1 font-semibold">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 rounded-full bg-white/70 px-5 py-2 text-center font-bold backdrop-blur-md dark:bg-slate-900/60">{footer}</div>}
    </div>
  )
}

function PasswordInput({ value, onChange, autoComplete, id, placeholder }: { value: string; onChange: (v: string) => void; autoComplete: string; id?: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} className="field pr-12" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} required />
      <button type="button" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-lg hover:bg-black/5 dark:hover:bg-white/10" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow(!show)}>
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  )
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null
  return <div role="alert" className="mb-4 rounded-2xl bg-rose-500/15 px-4 py-3 font-bold text-rose-700 dark:text-rose-300">{error}</div>
}

export function Login() {
  const { setUser } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [loginValue, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const open = auth.registrationOpen()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await auth.login(loginValue, password)
      auth.startSession(u, remember)
      setUser(u)
      const from = (loc.state as { from?: string } | null)?.from
      nav(from && from.startsWith('/app') ? from : '/app', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="С возвращением!"
      subtitle="Войдите, чтобы продолжить свои серии 🔥"
      footer={open ? <>Ещё нет аккаунта? <Link className="text-[var(--accent-2)] underline" to="/register">Создать</Link></> : <Link className="underline" to="/">← На главную</Link>}
    >
      {open && <div className="mb-4 rounded-2xl bg-sky-500/15 px-4 py-3 text-sm font-bold">Приложение ещё не настроено — сначала <Link className="underline" to="/register">зарегистрируйте владельца</Link>.</div>}
      <ErrorBox error={error} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Логин или email">
          <input className="field" value={loginValue} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required autoFocus />
        </Field>
        <Field label="Пароль">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent-2)]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Запомнить меня
          </label>
          <Link to="/forgot" className="font-bold text-[var(--accent-2)] underline">Забыли пароль?</Link>
        </div>
        <button className="btn btn-primary w-full text-lg" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </AuthShell>
  )
}

export function Register() {
  const { setUser } = useApp()
  const toast = useToast()
  const nav = useNavigate()
  const [f, setF] = useState({ login: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })

  if (!auth.registrationOpen()) {
    return (
      <AuthShell title="Регистрация закрыта" subtitle="Это персональное приложение: владелец уже зарегистрирован.">
        <div className="space-y-3">
          <Link to="/login" className="btn btn-primary w-full">Войти</Link>
          <Link to="/" className="btn btn-ghost w-full">На главную</Link>
        </div>
      </AuthShell>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (f.password !== f.confirm) return setError('Пароли не совпадают')
    setBusy(true)
    try {
      const u = await auth.register(f.login, f.email, f.password)
      auth.startSession(u, true)
      setUser(u)
      toast('Аккаунт создан. Добро пожаловать!')
      nav('/app', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle="Регистрация доступна только владельцу — один раз."
      footer={<>Уже есть аккаунт? <Link className="text-[var(--accent-2)] underline" to="/login">Войти</Link></>}
    >
      <ErrorBox error={error} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Логин" hint="Латиница, цифры, точка, дефис, подчёркивание">
          <input className="field" value={f.login} onChange={(e) => set('login')(e.target.value)} autoComplete="username" required autoFocus />
        </Field>
        <Field label="Email" hint="Нужен для восстановления пароля">
          <input className="field" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов, буквы и цифры">
          <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="Подтверждение пароля" error={f.confirm && f.confirm !== f.password ? 'Пароли не совпадают' : null}>
          <PasswordInput value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </Field>
        <button className="btn btn-primary w-full text-lg" disabled={busy}>{busy ? 'Создаём…' : 'Зарегистрироваться'}</button>
      </form>
    </AuthShell>
  )
}

export function Forgot() {
  const toast = useToast()
  const nav = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mail, setMail] = useState<auth.OutboxMail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const request = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!auth.EMAIL_RE.test(email)) return setError('Введите корректный email')
    setBusy(true)
    try {
      setMail(await auth.requestReset(email))
      setStep('code')
    } finally {
      setBusy(false)
    }
  }

  const confirmReset = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) return setError('Пароли не совпадают')
    setBusy(true)
    try {
      await auth.confirmReset(email, code, password)
      toast('Пароль изменён. Войдите с новым паролем')
      nav('/login', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle={step === 'email' ? 'Укажите email — мы отправим код подтверждения.' : `Если ${email} зарегистрирован, на него отправлен код.`}
      footer={<Link className="underline" to="/login">← Вернуться ко входу</Link>}
    >
      <ErrorBox error={error} />
      {step === 'email' ? (
        <form onSubmit={request} className="space-y-4">
          <Field label="Email">
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
          </Field>
          <button className="btn btn-primary w-full text-lg" disabled={busy}>Отправить код</button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="space-y-4">
          {mail && (
            <div className="rounded-2xl border border-dashed border-amber-500/60 bg-amber-400/15 px-4 py-3 text-sm">
              <div className="font-black">📬 Режим разработки: почта не подключена</div>
              <div className="text-soft mt-1 whitespace-pre-line font-semibold">{mail.body}</div>
            </div>
          )}
          <Field label="Код из письма">
            <input className="field text-center text-2xl font-black tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" required autoFocus />
          </Field>
          <Field label="Новый пароль" hint="Минимум 8 символов, буквы и цифры">
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Field label="Повторите пароль">
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </Field>
          <button className="btn btn-primary w-full text-lg" disabled={busy || code.length !== 6}>Сменить пароль</button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => { setStep('email'); setCode(''); setMail(null) }}>Отправить код ещё раз</button>
        </form>
      )}
    </AuthShell>
  )
}
