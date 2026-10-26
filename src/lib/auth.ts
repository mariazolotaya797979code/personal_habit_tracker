import { KEYS, readJSON, uid, writeJSON } from './storage'
import type { User } from './types'

const enc = new TextEncoder()
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256)
  return toHex(bits)
}

const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)

export const getUsers = () => readJSON<User[]>(KEYS.users, [])
const setUsers = (users: User[]) => writeJSON(KEYS.users, users)

export const registrationOpen = () => getUsers().length === 0

export const LOGIN_RE = /^[a-zA-Z0-9_.-]{3,32}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function passwordProblem(p: string): string | null {
  if (p.length < 8) return 'Пароль должен быть не короче 8 символов'
  if (!/[a-zA-Zа-яА-Я]/.test(p) || !/\d/.test(p)) return 'Пароль должен содержать буквы и цифры'
  return null
}

export async function register(login: string, email: string, password: string, name?: string): Promise<User> {
  if (!registrationOpen()) throw new Error('Регистрация закрыта: у приложения уже есть владелец')
  if (!LOGIN_RE.test(login)) throw new Error('Логин: 3–32 символа, латиница, цифры, точка, дефис или подчёркивание')
  if (!EMAIL_RE.test(email)) throw new Error('Введите корректный email')
  const problem = passwordProblem(password)
  if (problem) throw new Error(problem)
  const salt = newSalt()
  const user: User = {
    id: uid(),
    login: login.trim(),
    email: email.trim().toLowerCase(),
    name: (name || login).trim(),
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: Date.now(),
  }
  setUsers([user])
  return user
}

export async function login(loginOrEmail: string, password: string): Promise<User> {
  const q = loginOrEmail.trim().toLowerCase()
  const user = getUsers().find((u) => u.login.toLowerCase() === q || u.email === q)
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) throw new Error('Неверный логин или пароль')
  return user
}

export function startSession(user: User, remember: boolean) {
  const value = JSON.stringify({ userId: user.id, at: Date.now() })
  if (remember) localStorage.setItem(KEYS.session, value)
  else sessionStorage.setItem(KEYS.session, value)
}

export function endSession() {
  localStorage.removeItem(KEYS.session)
  sessionStorage.removeItem(KEYS.session)
}

export function sessionUser(): User | null {
  try {
    const raw = sessionStorage.getItem(KEYS.session) ?? localStorage.getItem(KEYS.session)
    if (!raw) return null
    const { userId } = JSON.parse(raw)
    return getUsers().find((u) => u.id === userId) ?? null
  } catch {
    return null
  }
}

export async function updateProfile(userId: string, patch: { name?: string; login?: string; email?: string }): Promise<User> {
  const users = getUsers()
  const u = users.find((x) => x.id === userId)
  if (!u) throw new Error('Пользователь не найден')
  if (patch.login !== undefined && !LOGIN_RE.test(patch.login)) throw new Error('Логин: 3–32 символа, латиница, цифры, точка, дефис или подчёркивание')
  if (patch.email !== undefined && !EMAIL_RE.test(patch.email)) throw new Error('Введите корректный email')
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('Имя не может быть пустым')
  Object.assign(u, {
    ...(patch.name !== undefined && { name: patch.name.trim() }),
    ...(patch.login !== undefined && { login: patch.login.trim() }),
    ...(patch.email !== undefined && { email: patch.email.trim().toLowerCase() }),
  })
  setUsers(users)
  return { ...u }
}

export async function changePassword(userId: string, current: string, next: string) {
  const users = getUsers()
  const u = users.find((x) => x.id === userId)
  if (!u) throw new Error('Пользователь не найден')
  if ((await hashPassword(current, u.salt)) !== u.passwordHash) throw new Error('Текущий пароль указан неверно')
  const problem = passwordProblem(next)
  if (problem) throw new Error(problem)
  u.salt = newSalt()
  u.passwordHash = await hashPassword(next, u.salt)
  setUsers(users)
}

export interface OutboxMail { id: string; to: string; subject: string; body: string; at: number }

/** Режим разработки: SMTP не подключён, письма складываются в локальный «почтовый ящик» и в консоль. */
export function sendMail(to: string, subject: string, body: string): OutboxMail {
  const mail = { id: uid(), to, subject, body, at: Date.now() }
  const box = readJSON<OutboxMail[]>(KEYS.outbox, [])
  writeJSON(KEYS.outbox, [mail, ...box].slice(0, 20))
  console.info(`[DEV MAIL] To: ${to}\nSubject: ${subject}\n\n${body}`)
  return mail
}

export const getOutbox = () => readJSON<OutboxMail[]>(KEYS.outbox, [])

interface ResetTicket { userId: string; codeHash: string; expires: number; attempts: number }

export async function requestReset(email: string): Promise<OutboxMail | null> {
  const user = getUsers().find((u) => u.email === email.trim().toLowerCase())
  if (!user) return null
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
  const ticket: ResetTicket = { userId: user.id, codeHash: await hashPassword(code, user.id), expires: Date.now() + 15 * 60000, attempts: 0 }
  writeJSON(KEYS.reset, ticket)
  return sendMail(user.email, 'Восстановление пароля', `Ваш код для восстановления пароля: ${code}\nКод действует 15 минут.`)
}

export async function confirmReset(email: string, code: string, next: string) {
  const ticket = readJSON<ResetTicket | null>(KEYS.reset, null)
  const users = getUsers()
  const user = users.find((u) => u.email === email.trim().toLowerCase())
  if (!ticket || !user || ticket.userId !== user.id) throw new Error('Запрос на восстановление не найден. Запросите код заново')
  if (Date.now() > ticket.expires) { localStorage.removeItem(KEYS.reset); throw new Error('Срок действия кода истёк. Запросите новый') }
  if (ticket.attempts >= 5) { localStorage.removeItem(KEYS.reset); throw new Error('Слишком много попыток. Запросите новый код') }
  if ((await hashPassword(code.trim(), user.id)) !== ticket.codeHash) {
    writeJSON(KEYS.reset, { ...ticket, attempts: ticket.attempts + 1 })
    throw new Error('Неверный код')
  }
  const problem = passwordProblem(next)
  if (problem) throw new Error(problem)
  user.salt = newSalt()
  user.passwordHash = await hashPassword(next, user.salt)
  setUsers(users)
  localStorage.removeItem(KEYS.reset)
}

export function deleteAccount(userId: string) {
  setUsers(getUsers().filter((u) => u.id !== userId))
  localStorage.removeItem(KEYS.data(userId))
  localStorage.removeItem(KEYS.reset)
  localStorage.removeItem(KEYS.outbox)
  endSession()
}
