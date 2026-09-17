// Generates original branded artwork so the site never reuses aromasenseusa.com photos.
//  - a unique generative cover for every blog article  -> public/blog-art/<handle>.svg
//  - a set of abstract editorial panels for the storefront -> public/art/*.svg
// Run: node scripts/gen-art.mjs [--purge]   (also runs at the end of `npm run scrape`)

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'server', 'data')

// ---- deterministic RNG ---------------------------------------------------

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- topic detection ---------------------------------------------------

const TOPICS = [
  [/vitamin\s*c|ascorb/i, 'Vitamin C'],
  [/negative ion/i, 'Negative Ions'],
  [/pressure/i, 'Water Pressure'],
  [/aromatherap|essential oil|lavender|jasmine|eucalyptus|lemon|citrus|mango|scent|fragrance|oil/i, 'Aromatherapy'],
  [/chlorine|filter|hard water|tap water|contaminant|rust|sediment|bacteria|soft water|what.?s in/i, 'Water Quality'],
  [/hair/i, 'Hair'],
  [/skin|acne|eczema|collagen|hydrat|derma|glow|complexion/i, 'Skin'],
  [/spa|hotel|resort|luxur|five[- ]star|ritz|four seasons|home spa/i, 'The Spa'],
  [/install|maintain|clean|replace|cartridge|how it works|micro.?fiber|microfabric|screen/i, 'Care'],
  [/shower ?head|showerhead|handheld|wall.?mount|rainfall|new shower/i, 'Shower Heads'],
  [/winter|summer|fall|autumn|spring|holiday|season|christmas/i, 'Seasonal'],
  [/gift|wedding|present/i, 'Gifting'],
  [/morning|night|sleep|routine|unwind|relax|de-?stress|wellness|self[- ]care|shower at|how long|how often/i, 'The Ritual'],
]
function topicFor(title, handle) {
  const s = `${title} ${handle}`
  for (const [re, label] of TOPICS) if (re.test(s)) return label
  return 'Journal'
}

// ---- drawing -----------------------------------------------------------

const GOLD = ['#f0dcae', '#e7cf9b', '#d8b978', '#c9a75e', '#b08d47']

function smoothPath(pts) {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1]
    const [x1, y1] = pts[k]
    d += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`
  }
  return d
}

// A — flowing horizontal contour field
function styleContours(rng, w, h) {
  const lines = 22 + Math.floor(rng() * 10)
  const amp = h * (0.06 + rng() * 0.09)
  const freq = (0.8 + rng() * 1.7) * (Math.PI / w)
  const phase = rng() * 6.28
  const tilt = (rng() - 0.5) * h * 0.45
  let out = ''
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1)
    const y0 = h * -0.04 + t * h * 1.08
    const p = phase + i * (0.26 + rng() * 0.28)
    const pts = []
    for (let x = -60; x <= w + 60; x += w / 18) {
      const y =
        y0 + Math.sin(x * freq + p) * amp + (x / w - 0.5) * tilt + Math.sin(x * freq * 0.4 + p) * amp * 0.4
      pts.push([x, y])
    }
    const centre = 1 - Math.abs(t - 0.5) * 1.5
    const op = Math.max(0.08, 0.2 + centre * 0.42)
    out += `<path d="${smoothPath(pts)}" fill="none" stroke="${GOLD[i % GOLD.length]}" stroke-width="${(0.8 + rng() * 1.7).toFixed(2)}" stroke-opacity="${op.toFixed(3)}"/>`
  }
  return out
}

// B — concentric ripples from a droplet
function styleRipples(rng, w, h) {
  const cx = w * (0.25 + rng() * 0.5)
  const cy = h * (0.2 + rng() * 0.55)
  const n = 14 + Math.floor(rng() * 8)
  const gap = (Math.max(w, h) * 0.95) / n
  let out = ''
  for (let i = 1; i <= n; i++) {
    const r = i * gap * (0.9 + rng() * 0.22)
    const op = Math.max(0.05, 0.55 - i * 0.03)
    out += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="none" stroke="${GOLD[i % GOLD.length]}" stroke-width="${(0.6 + rng() * 1.4).toFixed(2)}" stroke-opacity="${op.toFixed(3)}"/>`
  }
  out += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(gap * 0.8).toFixed(0)}" fill="#e7cf9b" fill-opacity="0.55"/>`
  return out
}

// C — a luminous droplet: a big soft-lit circle sitting on the canvas + orbiting rings
function styleArc(rng, w, h) {
  const cx = w * (0.32 + rng() * 0.42)
  const cy = h * (0.4 + rng() * 0.3)
  const r = Math.min(w, h) * (0.28 + rng() * 0.14)
  let rings = ''
  for (let i = 0; i < 9; i++) {
    const rr = r + (i + 1) * (r * 0.16 + rng() * r * 0.1)
    rings += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rr.toFixed(0)}" fill="none" stroke="${GOLD[i % GOLD.length]}" stroke-width="${(0.8 + rng()).toFixed(2)}" stroke-opacity="${(0.34 - i * 0.035).toFixed(3)}"/>`
  }
  // a couple of drifting lines to keep it from feeling empty
  const flow = styleContours(rng, w, h)
    .replace(/stroke-opacity="[^"]+"/g, 'stroke-opacity="0.05"')
  return `<g opacity="0.6">${flow}</g><circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#arc)"/><circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="none" stroke="#e7cf9b" stroke-opacity="0.4" stroke-width="1.5"/>${rings}`
}
const ARC_DEF = `<radialGradient id="arc" cx="0.42" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#f0dcae" stop-opacity="0.3"/>
      <stop offset="0.55" stop-color="#c9a75e" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#c9a75e" stop-opacity="0"/>
    </radialGradient>`

function field(rng, w, h) {
  const s = Math.floor(rng() * 3)
  if (s === 0) return { defs: '', body: styleContours(rng, w, h) }
  if (s === 1) return { defs: '', body: styleRipples(rng, w, h) }
  return { defs: ARC_DEF, body: styleArc(rng, w, h) }
}

// Simplified shower-head faceplate mark (ring + nozzle dots + one droplet) — matches
// BrandMark.tsx / favicon.svg, kept light for use as a small low-opacity watermark.
const MARK = (x, y, s, op) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op}">
    <circle cx="50" cy="38" r="27" fill="none" stroke="#c9a75e" stroke-width="5"/>
    <circle cx="50" cy="38" r="2.6" fill="#c9a75e"/>
    <circle cx="50" cy="28.5" r="2.2" fill="#c9a75e"/>
    <circle cx="58.2" cy="33.2" r="2.2" fill="#c9a75e"/>
    <circle cx="58.2" cy="42.8" r="2.2" fill="#c9a75e"/>
    <circle cx="50" cy="47.5" r="2.2" fill="#c9a75e"/>
    <circle cx="41.8" cy="42.8" r="2.2" fill="#c9a75e"/>
    <circle cx="41.8" cy="33.2" r="2.2" fill="#c9a75e"/>
    <path d="M58 62c9 12 9 23 0 23-9 0-9-11 0-23Z" fill="#b08d47"/></g>`

function glowDef(rng, strength = 1) {
  const gx = (0.2 + rng() * 0.6).toFixed(3)
  const gy = (0.08 + rng() * 0.5).toFixed(3)
  return `<radialGradient id="glow" cx="${gx}" cy="${gy}" r="0.9">
      <stop offset="0" stop-color="#c9a75e" stop-opacity="${(0.2 * strength).toFixed(3)}"/>
      <stop offset="0.55" stop-color="#c9a75e" stop-opacity="0"/>
    </radialGradient>`
}

function frame(defs, inner, w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#181410"/><stop offset="1" stop-color="#221b14"/>
    </linearGradient>
    ${defs}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${inner}
  <rect width="${w}" height="${h}" fill="none" stroke="#c9a75e" stroke-opacity="0.16" stroke-width="1.5"/>
</svg>`
}

function blogCover(handle, title) {
  const rng = mulberry32(hash(handle))
  const W = 1200
  const H = 760
  const { defs, body } = field(rng, W, H)
  const topic = topicFor(title, handle).toUpperCase()
  const inner = `<g>${body}</g>
    ${MARK(W - 150, H - 152, 1.15, 0.22)}
    <g font-family="Georgia, 'Times New Roman', serif">
      <text x="64" y="90" fill="#e7cf9b" font-size="23" letter-spacing="6" font-weight="600" xml:space="preserve">${topic}</text>
      <line x1="64" y1="112" x2="164" y2="112" stroke="#c9a75e" stroke-opacity="0.8" stroke-width="1.5"/>
    </g>`
  return frame(glowDef(rng) + defs, inner, W, H)
}

function panel(seed, W, H, opts = {}) {
  const rng = mulberry32(hash(seed))
  const { defs, body } = field(rng, W, H)
  // panels are decor behind text/photos — push contrast a little
  const bolder = body
    .replace(/stroke-opacity="([\d.]+)"/g, (_, v) => `stroke-opacity="${Math.min(0.85, +v * 1.6).toFixed(3)}"`)
    .replace(/stroke-width="([\d.]+)"/g, (_, v) => `stroke-width="${(+v * 1.25).toFixed(2)}"`)
  const inner = `<g>${bolder}</g>${
    opts.mark === false ? '' : MARK(W - H * 0.26, H - H * 0.26, (H / 100) * 0.85, 0.16)
  }`
  return frame(glowDef(rng, 1.5) + defs, inner, W, H)
}

// ---- main ------------------------------------------------------------

async function main() {
  await mkdir(path.join(ROOT, 'public', 'blog-art'), { recursive: true })
  await mkdir(path.join(ROOT, 'public', 'art'), { recursive: true })

  const panels = {
    'hero.svg': [2000, 1200],
    'ritual-1.svg': [1000, 1200],
    'ritual-2.svg': [1000, 1200],
    'ritual-3.svg': [1000, 1200],
    'feature-tall.svg': [1000, 1250],
    'feature-wide.svg': [1600, 1000],
    'look-1.svg': [1200, 1200],
    'look-2.svg': [1000, 1000],
    'look-3.svg': [1000, 1000],
    'look-4.svg': [1000, 1000],
    'page-1.svg': [2000, 1100],
    'page-2.svg': [2000, 1100],
    'page-3.svg': [2000, 1100],
  }
  for (const [name, [w, h]] of Object.entries(panels)) {
    await writeFile(path.join(ROOT, 'public', 'art', name), panel(name, w, h))
  }
  console.log(`art: ${Object.keys(panels).length} panels`)

  const blogPath = path.join(DATA, 'blog.json')
  if (existsSync(blogPath)) {
    const articles = JSON.parse(await readFile(blogPath, 'utf8'))
    for (const a of articles) {
      const rel = `blog-art/${a.handle}.svg`
      await writeFile(path.join(ROOT, 'public', rel), blogCover(a.handle, a.title))
      a.image = '/' + rel
      a.bodyHtml = a.bodyHtml
        .replace(/<img[^>]*>/gi, '')
        .replace(/<p>\s*<\/p>/gi, '')
        .replace(/<a[^>]*>\s*<\/a>/gi, '')
    }
    await writeFile(blogPath, JSON.stringify(articles, null, 2))
    console.log(`blog: ${articles.length} covers`)
  }

  if (existsSync(path.join(ROOT, 'public', 'blog')) && process.argv.includes('--purge')) {
    await rm(path.join(ROOT, 'public', 'blog'), { recursive: true, force: true })
    console.log('removed public/blog (scraped photos)')
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
