import sharp from 'sharp'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const src = process.argv[2]
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const bgDir = join('public', 'bg')
const iconDir = join('public', 'icons')
mkdirSync(bgDir, { recursive: true })
mkdirSync(iconDir, { recursive: true })

if (src) {
  for (const d of days) {
    const file = join(src, `bg-${d}.jpg`)
    if (!existsSync(file)) continue
    await sharp(file).resize({ width: 1920, kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(join(bgDir, `${d}.webp`))
    await sharp(file).resize({ width: 48 }).blur(2).webp({ quality: 50 }).toFile(join(bgDir, `${d}-tiny.webp`))
  }
}

const icon = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="w" cx="50%" cy="30%" r="80%">
      <stop offset="0" stop-color="#5cc8ff"/><stop offset="1" stop-color="#0a4e9e"/>
    </radialGradient>
    <radialGradient id="b" cx="38%" cy="32%" r="70%">
      <stop offset="0" stop-color="#fff59a"/><stop offset=".45" stop-color="#ffd21f"/><stop offset="1" stop-color="#e88a00"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#w)"/>
  <circle cx="120" cy="110" r="14" fill="#fff" opacity=".5"/><circle cx="400" cy="420" r="18" fill="#fff" opacity=".35"/>
  <circle cx="420" cy="120" r="9" fill="#fff" opacity=".55"/><circle cx="90" cy="400" r="10" fill="#fff" opacity=".4"/>
  <circle cx="256" cy="262" r="${pad ? 150 : 178}" fill="url(#b)"/>
  <ellipse cx="205" cy="190" rx="60" ry="34" fill="#fff" opacity=".55" transform="rotate(-30 205 190)"/>
  <ellipse cx="208" cy="240" rx="${pad ? 15 : 18}" ry="${pad ? 24 : 28}" fill="#1b1b1b"/>
  <ellipse cx="304" cy="240" rx="${pad ? 15 : 18}" ry="${pad ? 24 : 28}" fill="#1b1b1b"/>
  <path d="M${pad ? 180 : 165} 300 Q256 ${pad ? 380 : 400} ${pad ? 332 : 347} 300" stroke="#1b1b1b" stroke-width="${pad ? 16 : 19}" fill="none" stroke-linecap="round"/>
</svg>`

await sharp(Buffer.from(icon(false))).resize(192).png().toFile(join(iconDir, 'icon-192.png'))
await sharp(Buffer.from(icon(false))).resize(512).png().toFile(join(iconDir, 'icon-512.png'))
await sharp(Buffer.from(icon(true))).resize(512).png().toFile(join(iconDir, 'maskable-512.png'))
await sharp(Buffer.from(icon(false))).resize(180).png().toFile(join(iconDir, 'apple-touch-icon.png'))
writeFileSync(join('public', 'favicon.svg'), icon(false).trim())
console.log('assets ready')
