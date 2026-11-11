/**
 * 30-секундный скринкаст прохождения по приложению.
 * Запуск: сервер на 5181, затем
 *   npx --yes -p playwright node scripts/record-demo.mjs
 */
import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.DEMO_URL ?? 'http://localhost:5181'
const OUT_DIR = 'docs/demo'
const W = 1280
const H = 720

const sleep = (page, ms) => page.waitForTimeout(ms)

async function hoverClick(page, locator) {
  await locator.first().waitFor({ state: 'visible', timeout: 8000 })
  const box = await locator.first().boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 })
  await sleep(page, 180)
  await locator.first().click()
}

function seedInPage() {
  const users = JSON.parse(localStorage.getItem('pht:users') ?? '[]')
  if (!users[0]) return 'no user'
  users[0].name = 'Анна'
  localStorage.setItem('pht:users', JSON.stringify(users))
  const uid = users[0].id
  const key = `pht:data:${uid}`
  const d = JSON.parse(localStorage.getItem(key))
  d.settings.theme = 'light'
  localStorage.setItem('pht:theme', 'light')
  const pad = (n) => String(n).padStart(2, '0')
  const keyOf = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
  const addDays = (k, n) => {
    const [y, m, da] = k.split('-').map(Number)
    const dt = new Date(y, m - 1, da)
    dt.setDate(dt.getDate() + n)
    return keyOf(dt)
  }
  const today = keyOf(new Date())
  const start = addDays(today, -49)
  for (const h of d.habits) h.createdAt = start
  const byName = Object.fromEntries(d.habits.map((h) => [h.name, h]))
  const wd = (k) => {
    const [y, m, da] = k.split('-').map(Number)
    return (new Date(y, m - 1, da).getDay() + 6) % 7
  }
  const entries = {}
  for (const h of d.habits) entries[h.id] = {}
  for (let i = 0; i <= 49; i++) {
    const k = addDays(start, i)
    const day = wd(k)
    const water = byName['Выпить воду']
    const read = byName['Читать книгу']
    const sport = byName['Зарядка']
    const med = byName['Медитация']
    if (water && i % 11 !== 3) entries[water.id][k] = i % 9 === 0 ? 6 : 8
    if (read && i % 13 !== 5) entries[read.id][k] = 20
    if (sport && day < 5 && i % 8 !== 2) entries[sport.id][k] = 15
    if (med && (day === 0 || day === 2 || day === 4) && i % 10 !== 1) entries[med.id][k] = 10
  }
  if (byName['Выпить воду']) entries[byName['Выпить воду'].id][today] = 8
  if (byName['Читать книгу']) entries[byName['Читать книгу'].id][today] = 20
  if (byName['Зарядка']) entries[byName['Зарядка'].id][today] = 15
  d.entries = entries
  d.updatedAt = Date.now()
  localStorage.setItem(key, JSON.stringify(d))
  const sessRaw = localStorage.getItem('pht:session')
  if (sessRaw) {
    const s = JSON.parse(sessRaw)
    s.user = users[0]
    localStorage.setItem('pht:session', JSON.stringify(s))
  }
  return today
}

async function prepare(browser) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, locale: 'ru-RU' })
  const page = await context.newPage()
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.locator('form input').nth(0).fill('anna')
  await page.locator('form input').nth(1).fill('anna@example.com')
  await page.locator('form input').nth(2).fill('habits2026')
  await page.locator('form input').nth(3).fill('habits2026')
  await page.locator('form').evaluate((form) => form.requestSubmit())
  await page.waitForURL('**/app', { timeout: 15000 })
  const starter = page.getByRole('button', { name: 'Стартовый набор' })
  await starter.waitFor({ state: 'visible', timeout: 8000 })
  await starter.click()
  await page.getByRole('checkbox', { name: /Выпить воду/ }).waitFor({ timeout: 10000 })
  await sleep(page, 400)
  const seeded = await page.evaluate(seedInPage)
  console.log('seed', seeded)
  if (!seeded || seeded === 'no user') throw new Error('Не удалось заполнить демо-данные')
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('checkbox', { name: /Выпить воду/ }).waitFor({ timeout: 10000 })
  const n = await page.getByRole('checkbox').count()
  console.log('habits on today', n)
  if (n < 3) throw new Error('После сида на дашборде нет привычек')
  const state = path.join(OUT_DIR, 'storage.json')
  await context.storageState({ path: state })
  await context.close()
  return state
}

async function tour(browser, state) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const videoDir = path.join(OUT_DIR, '_tmp')
  fs.rmSync(videoDir, { recursive: true, force: true })
  fs.mkdirSync(videoDir, { recursive: true })

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    locale: 'ru-RU',
    storageState: state,
    recordVideo: { dir: videoDir, size: { width: W, height: H } },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    const st = document.createElement('style')
    st.textContent = 'html,body,*{scrollbar-width:none!important} *::-webkit-scrollbar{display:none!important}'
    document.documentElement.appendChild(st)
  })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await sleep(page, 4200)
  await hoverClick(page, page.getByRole('link', { name: /Открыть приложение|В приложение/ }))
  await page.waitForURL('**/app')
  await sleep(page, 3500)

  const meditation = page.getByRole('checkbox', { name: /Медитация/ })
  await meditation.waitFor({ state: 'visible', timeout: 8000 })
  await hoverClick(page, meditation)
  await sleep(page, 3500)

  await hoverClick(page, page.getByRole('link', { name: 'Привычки' }))
  await page.waitForURL('**/app/habits')
  await sleep(page, 4000)

  await hoverClick(page, page.getByRole('link', { name: 'Календарь' }))
  await page.waitForURL('**/app/calendar')
  await sleep(page, 1200)
  const heat = page.getByRole('button', { name: /Тепловая карта/ })
  if (await heat.isVisible().catch(() => false)) {
    await hoverClick(page, heat)
  }
  await sleep(page, 3800)

  await hoverClick(page, page.getByRole('link', { name: 'Статистика' }))
  await page.waitForURL('**/app/stats')
  await sleep(page, 4500)

  const video = page.video()
  await context.close()
  const webm = await video.path()
  return webm
}

function convert(webm, mp4) {
  const ffmpeg = process.env.PLAYWRIGHT_FFMPEG
    ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'ffmpeg-1013', 'ffmpeg-win64.exe')
  const candidates = [
    process.env.FFMPEG,
    path.join('node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    ffmpeg,
    path.join(process.env.LOCALAPPDATA ?? '', 'Temp', 'cursor-sandbox-cache', '6c8ea4f64a44c7c41b4781137f34b60d', 'playwright', 'ffmpeg-1013', 'ffmpeg-win64.exe'),
  ].filter(Boolean)

  let bin = candidates.find((c) => fs.existsSync(c))
  if (!bin) {
    const pw = process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'ms-playwright')
      : ''
    if (pw && fs.existsSync(pw)) {
      for (const dir of fs.readdirSync(pw)) {
        const p = path.join(pw, dir, 'ffmpeg-win64.exe')
        if (fs.existsSync(p)) bin = p
        const p2 = path.join(pw, dir, 'ffmpeg.exe')
        if (fs.existsSync(p2)) bin = p2
      }
    }
  }
  if (!bin) {
    console.warn('ffmpeg не найден, оставляю webm')
    fs.copyFileSync(webm, mp4.replace(/\.mp4$/, '.webm'))
    return mp4.replace(/\.mp4$/, '.webm')
  }
  const r = spawnSync(bin, [
    '-y', '-i', webm,
    '-t', '30',
    '-vf', 'fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    mp4,
  ], { encoding: 'utf8' })
  if (r.status !== 0) {
    console.warn(r.stderr?.slice(-800))
    const r2 = spawnSync(bin, ['-y', '-i', webm, '-t', '30', '-c', 'copy', '-an', mp4.replace(/\.mp4$/, '.webm')], { encoding: 'utf8' })
    if (r2.status === 0) return mp4.replace(/\.mp4$/, '.webm')
    fs.copyFileSync(webm, path.join(OUT_DIR, 'demo.webm'))
    return path.join(OUT_DIR, 'demo.webm')
  }
  return mp4
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const state = await prepare(browser)
  const webm = await tour(browser, state)
  const mp4 = path.join(OUT_DIR, 'demo.mp4')
  const out = convert(webm, mp4)
  console.log('saved', out)
} finally {
  await browser.close()
}
