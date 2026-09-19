// One-shot (and re-runnable) product image optimizer: `node scripts/optimize-images.ts`
//  - GIF  -> animated WebP (max 640px wide)
//  - PNG  -> JPEG when it has no transparency, otherwise an optimized PNG (max 1200px)
//  - JPEG -> resized to max 1400px, mozjpeg q80
// Files that change extension get every reference in the data/source files rewritten.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp') as typeof import('sharp')
const root = new URL('../', import.meta.url).pathname
const dir = path.join(root, 'public/products')

const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))

const renames = new Map<string, string>() // old web path -> new web path
const web = (f: string) => '/' + path.relative(path.join(root, 'public'), f)
let before = 0
let after = 0

for (const file of walk(dir)) {
  const ext = path.extname(file).toLowerCase()
  const size = fs.statSync(file).size
  before += size
  let out: Buffer | null = null
  let target = file

  if (ext === '.gif') {
    out = await sharp(file, { animated: true }).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 65, effort: 4 }).toBuffer()
    target = file.replace(/\.gif$/i, '.webp')
  } else if (ext === '.png') {
    const meta = await sharp(file).metadata()
    const img = sharp(file).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    if (meta.hasAlpha) out = await img.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer()
    else {
      out = await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
      target = file.replace(/\.png$/i, '.jpg')
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    if (size <= 200 * 1024) {
      after += size
      continue
    }
    out = await sharp(file).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
  } else {
    after += size
    continue
  }

  if (target !== file && fs.existsSync(target)) throw new Error(`refusing to overwrite existing ${target}`)
  if (target === file && out.length >= size) {
    after += size
    continue
  }
  fs.writeFileSync(target, out)
  if (target !== file) {
    fs.unlinkSync(file)
    renames.set(web(file), web(target))
  }
  after += out.length
}

// rewrite references to renamed files
const targets = [
  'index.html',
  ...walk(path.join(root, 'server/data')),
  ...walk(path.join(root, 'src')),
  path.join(root, 'server/seo-worker.ts'),
].map((f) => (path.isAbsolute(f) ? f : path.join(root, f)))
let rewritten = 0
for (const f of targets) {
  if (!/\.(json|tsx?|html)$/.test(f)) continue
  let text = fs.readFileSync(f, 'utf8')
  let changed = false
  for (const [from, to] of renames) {
    if (text.includes(from)) {
      text = text.split(from).join(to)
      changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(f, text)
    rewritten++
  }
}
const mb = (n: number) => (n / 1048576).toFixed(1) + ' MB'
console.log(`[images] ${mb(before)} -> ${mb(after)}; renamed ${renames.size} files; updated references in ${rewritten} files`)
