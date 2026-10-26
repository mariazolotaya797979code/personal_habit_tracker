import { describe, expect, it } from 'vitest'
import { addDays, rangeKeys, startOfWeek, weekdayIndex } from './date'
import { benefits, completionRate, dayProgress, isDue, motivation, overallStats, scheduleText, streakInfo } from './habits'
import type { Category, Entries, Habit } from './types'

const TODAY = '2026-10-26' // понедельник

function habit(p: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: 'Вода', icon: '💧', color: '#000', categoryId: null, schedule: { type: 'daily' }, reminderTime: null,
    unit: 'times', unitLabel: 'раз', amount: 1, allowedSkips: 0, archived: false, createdAt: '2026-09-01', order: 1, ...p,
  }
}

const mark = (keys: string[], id = 'h1', v = 1): Entries => ({ [id]: Object.fromEntries(keys.map((k) => [k, v])) })

describe('даты', () => {
  it('понедельник — индекс 0, неделя начинается с понедельника', () => {
    expect(weekdayIndex(TODAY)).toBe(0)
    expect(weekdayIndex('2026-11-01')).toBe(6)
    expect(startOfWeek('2026-11-01')).toBe(TODAY)
  })
  it('переход через месяц и год', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(rangeKeys('2026-10-30', '2026-11-02')).toHaveLength(4)
  })
})

describe('серии (ежедневно)', () => {
  it('считает серию, если сегодня ещё не отмечено', () => {
    const h = habit()
    const e = mark(['2026-10-23', '2026-10-24', '2026-10-25'])
    const s = streakInfo(h, e, TODAY)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
  })
  it('пропуск без поблажек сбрасывает серию и запоминает прошлую', () => {
    const h = habit({ createdAt: '2026-10-18' })
    const e = mark(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-25', TODAY])
    const s = streakInfo(h, e, TODAY)
    expect(s.current).toBe(4)
    expect(s.previous).toBe(4)
    expect(s.best).toBe(4)
  })
  it('легальный пропуск сохраняет серию и уменьшает остаток', () => {
    const h = habit({ createdAt: '2026-10-20', allowedSkips: 2 })
    const e = mark(['2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-25'])
    const s = streakInfo(h, e, TODAY)
    expect(s.current).toBe(5)
    expect(s.skipsUsedThisMonth).toBe(1)
    expect(s.skipsLeft).toBe(1)
  })
  it('лимит пропусков обновляется в новом месяце', () => {
    const h = habit({ createdAt: '2026-09-28', allowedSkips: 1 })
    // 29 сентября пропуск (использован лимит сентября), 2 октября — пропуск из лимита октября
    const e = mark(['2026-09-28', '2026-09-30', '2026-10-01', '2026-10-03'])
    const s = streakInfo(h, e, '2026-10-03')
    expect(s.current).toBe(4)
    expect(s.skipsLeft).toBe(0)
  })
  it('превышение лимита пропусков прерывает серию', () => {
    const h = habit({ createdAt: '2026-10-20', allowedSkips: 1 })
    const e = mark(['2026-10-20', '2026-10-23', '2026-10-24'])
    expect(streakInfo(h, e, '2026-10-24').current).toBe(2)
  })
  it('пропуски до начала серии не тратят лимит', () => {
    const h = habit({ createdAt: '2026-10-19', allowedSkips: 2 })
    const e = mark(['2026-10-22', '2026-10-24'])
    const s = streakInfo(h, e, '2026-10-24')
    expect(s.current).toBe(2)
    expect(s.skipsUsedThisMonth).toBe(1)
  })
})

describe('серии (по дням недели и N раз в неделю)', () => {
  it('нерабочие дни не прерывают серию «по будням»', () => {
    const h = habit({ schedule: { type: 'weekdays', days: [0, 1, 2, 3, 4] }, createdAt: '2026-10-19' })
    const e = mark(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', TODAY])
    expect(streakInfo(h, e, TODAY).current).toBe(6)
  })
  it('N раз в неделю: серия в неделях, текущая неделя не ломает серию', () => {
    const h = habit({ schedule: { type: 'perWeek', times: 2 }, createdAt: '2026-10-05' })
    const e = mark(['2026-10-05', '2026-10-07', '2026-10-13', '2026-10-15', '2026-10-20', '2026-10-25'])
    const s = streakInfo(h, e, TODAY)
    expect(s.unit).toBe('weeks')
    expect(s.current).toBe(3)
  })
  it('N раз в неделю: привычка не «должна» после выполнения нормы', () => {
    const h = habit({ schedule: { type: 'perWeek', times: 2 }, createdAt: '2026-10-01' })
    const e = mark(['2026-10-26', '2026-10-27'])
    expect(isDue(h, e, '2026-10-28')).toBe(false)
    expect(isDue(h, e, '2026-10-27')).toBe(true)
    expect(isDue(h, mark(['2026-10-26']), '2026-10-28')).toBe(true)
  })
  it('описание расписания', () => {
    expect(scheduleText({ type: 'weekdays', days: [0, 1, 2, 3, 4] })).toBe('По будням')
    expect(scheduleText({ type: 'weekdays', days: [5, 6] })).toBe('По выходным')
    expect(scheduleText({ type: 'perWeek', times: 3 })).toBe('3 раза в неделю')
    expect(scheduleText({ type: 'weekdays', days: [2, 0] })).toBe('Пн, Ср')
  })
})

describe('прогресс и проценты', () => {
  it('прогресс дня исключает архивные и ещё не созданные привычки', () => {
    const hs = [habit(), habit({ id: 'h2', archived: true }), habit({ id: 'h3', createdAt: '2026-10-27' })]
    const p = dayProgress(hs, mark([TODAY]), TODAY)
    expect(p).toMatchObject({ done: 1, total: 1 })
  })
  it('процент за 7 дней не штрафует за невыполненное сегодня', () => {
    const h = habit()
    const e = mark(rangeKeys('2026-10-20', '2026-10-25'))
    expect(completionRate(h, e, TODAY, 7)).toBe(100)
    expect(completionRate(h, mark(rangeKeys('2026-10-23', '2026-10-25')), TODAY, 7)).toBe(50)
  })
  it('процент учитывает дату создания', () => {
    const h = habit({ createdAt: '2026-10-24' })
    expect(completionRate(h, mark(['2026-10-24', '2026-10-25']), TODAY, 30)).toBe(100)
  })
})

describe('мотивация и польза', () => {
  it('«Вчера 3/5, сегодня 2/5 — подтянись!»', () => {
    const hs = ['a', 'b', 'c', 'd', 'e'].map((id) => habit({ id }))
    const y = addDays(TODAY, -1)
    const e: Entries = { a: { [y]: 1, [TODAY]: 1 }, b: { [y]: 1, [TODAY]: 1 }, c: { [y]: 1 } }
    const m = motivation(hs, e, TODAY)
    expect(m[0].text).toBe('Вчера 3/5, сегодня 2/5 — подтянись!')
    expect(m.some((x) => x.text.includes('не расстраивайся'))).toBe(true)
  })
  it('«держишься дольше на N дней»', () => {
    const h = habit({ createdAt: '2026-10-10' })
    const e = mark([...rangeKeys('2026-10-10', '2026-10-12'), ...rangeKeys('2026-10-20', '2026-10-25')])
    const m = motivation([h], e, TODAY)
    expect(m.some((x) => x.text.includes('дольше на 3 дня'))).toBe(true)
  })
  it('страницы превращаются в книги, стаканы — в литры, минуты вредных привычек — в сэкономленное время', () => {
    const cats: Category[] = [{ id: 'bad', name: 'Вредные привычки', icon: '🚭', color: '#000' }]
    const hs = [
      habit({ id: 'p', unit: 'pages', amount: 50 }),
      habit({ id: 'g', unit: 'glasses', amount: 8 }),
      habit({ id: 's', unit: 'minutes', categoryId: 'bad' }),
    ]
    const e: Entries = { p: { [TODAY]: 500 }, g: { [TODAY]: 8 }, s: { [TODAY]: 120 } }
    const b = benefits(hs, e, cats, TODAY)
    expect(b.find((x) => x.id === 'pages')?.hint).toContain('2 книги')
    expect(b.find((x) => x.id === 'water')?.value).toBe('2 л')
    expect(b.find((x) => x.id === 'saved')?.value).toBe('2 ч')
  })
  it('приблизительное количество книг согласуется по-русски', () => {
    const hs = [habit({ id: 'p', unit: 'pages' })]
    const hint = (pages: number) => benefits(hs, { p: { [TODAY]: pages } }, [], TODAY).find((x) => x.id === 'pages')?.hint
    expect(hint(1240)).toBe('≈ 5 книг')
    expect(hint(1225)).toBe('≈ 4,9 книги')
    expect(hint(250)).toBe('≈ 1 книга')
  })
  it('общая статистика: лучший день и распределение по категориям', () => {
    const hs = [habit({ id: 'a', categoryId: 'c1' }), habit({ id: 'b' })]
    const e: Entries = { a: { '2026-10-20': 1, '2026-10-21': 1 }, b: { '2026-10-21': 1 } }
    const s = overallStats(hs, e, [{ id: 'c1', name: 'Спорт', icon: '🏃', color: '#f00' }], TODAY)
    expect(s.total).toBe(3)
    expect(s.bestDay).toEqual({ key: '2026-10-21', done: 2 })
    expect(s.byCategory.map((c) => c.name)).toEqual(['Спорт', 'Без категории'])
  })
})
