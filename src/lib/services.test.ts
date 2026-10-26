import { beforeEach, describe, expect, it } from 'vitest'
import * as auth from './auth'
import { createInitialData, exportCSV, parseImport } from './storage'
import { isSyncDue } from './sync'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('авторизация', () => {
  it('регистрация только для первого пользователя', async () => {
    expect(auth.registrationOpen()).toBe(true)
    await auth.register('owner', 'Owner@Mail.ru', 'secret123')
    expect(auth.registrationOpen()).toBe(false)
    await expect(auth.register('other', 'o@mail.ru', 'secret123')).rejects.toThrow('Регистрация закрыта')
  })
  it('валидация пароля и email', async () => {
    await expect(auth.register('owner', 'bad', 'secret123')).rejects.toThrow('email')
    await expect(auth.register('owner', 'a@b.ru', 'short1')).rejects.toThrow('8 символов')
    await expect(auth.register('owner', 'a@b.ru', 'onlyletters')).rejects.toThrow('буквы и цифры')
  })
  it('вход по логину или email, неверный пароль отклоняется', async () => {
    await auth.register('owner', 'owner@mail.ru', 'secret123')
    expect((await auth.login('OWNER', 'secret123')).login).toBe('owner')
    expect((await auth.login('owner@mail.ru', 'secret123')).login).toBe('owner')
    await expect(auth.login('owner', 'wrong1234')).rejects.toThrow('Неверный')
  })
  it('пароль хранится в виде хеша', async () => {
    const u = await auth.register('owner', 'owner@mail.ru', 'secret123')
    expect(JSON.stringify(auth.getUsers())).not.toContain('secret123')
    expect(u.passwordHash).toHaveLength(64)
  })
  it('сессия: запомнить / не запоминать', async () => {
    const u = await auth.register('owner', 'owner@mail.ru', 'secret123')
    auth.startSession(u, false)
    expect(auth.sessionUser()?.id).toBe(u.id)
    expect(localStorage.getItem('pht:session')).toBeNull()
    auth.endSession()
    expect(auth.sessionUser()).toBeNull()
  })
  it('восстановление пароля по коду из письма', async () => {
    await auth.register('owner', 'owner@mail.ru', 'secret123')
    expect(await auth.requestReset('nobody@mail.ru')).toBeNull()
    const mail = await auth.requestReset('owner@mail.ru')
    const code = mail!.body.match(/\d{6}/)![0]
    await expect(auth.confirmReset('owner@mail.ru', '000000' === code ? '111111' : '000000', 'newpass123')).rejects.toThrow('Неверный код')
    await auth.confirmReset('owner@mail.ru', code, 'newpass123')
    await expect(auth.login('owner', 'secret123')).rejects.toThrow()
    expect((await auth.login('owner', 'newpass123')).login).toBe('owner')
    await expect(auth.confirmReset('owner@mail.ru', code, 'again1234')).rejects.toThrow('не найден')
  })
  it('смена пароля требует текущий пароль', async () => {
    const u = await auth.register('owner', 'owner@mail.ru', 'secret123')
    await expect(auth.changePassword(u.id, 'wrong1234', 'next12345')).rejects.toThrow('Текущий')
    await auth.changePassword(u.id, 'secret123', 'next12345')
    expect((await auth.login('owner', 'next12345')).id).toBe(u.id)
  })
  it('удаление аккаунта снова открывает регистрацию', async () => {
    const u = await auth.register('owner', 'owner@mail.ru', 'secret123')
    auth.deleteAccount(u.id)
    expect(auth.registrationOpen()).toBe(true)
  })
})

describe('данные', () => {
  it('9 категорий по умолчанию', () => {
    expect(createInitialData().categories.map((c) => c.name)).toEqual(['Здоровье', 'Работа', 'Образование', 'Спорт', 'Питание', 'Дом', 'Вредные привычки', 'Творчество', 'Сон'])
  })
  it('CSV экранирует разделители', () => {
    const d = createInitialData()
    d.habits.push({ id: 'h', name: 'Читать; "много"', icon: '📚', color: '#000', categoryId: null, schedule: { type: 'daily' }, reminderTime: null, unit: 'pages', unitLabel: 'стр.', amount: 20, allowedSkips: 0, archived: false, createdAt: '2026-10-01', order: 1 })
    d.entries.h = { '2026-10-02': 20 }
    const csv = exportCSV(d)
    expect(csv).toContain('2026-10-02;"Читать; ""много""";;20;стр.;нет')
  })
  it('импорт проверяет формат и дополняет настройки', () => {
    expect(() => parseImport('{oops')).toThrow('не JSON')
    expect(() => parseImport('{"foo":1}')).toThrow('не похож')
    const d = parseImport(JSON.stringify({ data: { habits: [], entries: {}, categories: [] } }))
    expect(d.settings.sync.frequency).toBe('auto')
  })
})

describe('синхронизация', () => {
  const day = 86400000
  it('расписание синхронизации', () => {
    const now = Date.now()
    expect(isSyncDue('auto', now, now, true)).toBe(true)
    expect(isSyncDue('auto', now, now, false)).toBe(false)
    expect(isSyncDue('daily', now - day / 2, now, true)).toBe(false)
    expect(isSyncDue('daily', now - day, now, true)).toBe(true)
    expect(isSyncDue('weekly', now - 6 * day, now, true)).toBe(false)
    expect(isSyncDue('monthly', now - 30 * day, now, true)).toBe(true)
    expect(isSyncDue('monthly', null, now, true)).toBe(true)
  })
})
