/**
 * Renders PNG app icons from public/htk-logo.svg with uniform padding.
 *
 * Usage:
 *   node scripts/generate-app-icons.mjs
 *   PADDING=0.15 node scripts/generate-app-icons.mjs
 *
 * PADDING is a fraction of the canvas edge (0–0.5). Default 0.12 (~12% inset).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SVG_PATH = join(ROOT, 'public', 'htk-logo.svg')

const paddingRatio = Math.min(
  0.45,
  Math.max(0, Number.parseFloat(String(process.env.PADDING ?? '0.12')) || 0.12),
)

/** @type {{ r: number; g: number; b: number; alpha: number }} */
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

/**
 * @param {Buffer} svgBuffer
 * @param {number} size
 * @param {number} pad
 */
async function renderPaddedIcon(svgBuffer, size, pad) {
  const inner = Math.max(1, size - 2 * pad)
  const scaled = await sharp(svgBuffer)
    .resize(inner, inner, {
      fit: 'contain',
      background: BG,
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: scaled, gravity: 'center' }])
    .png()
}

async function main() {
  const svgBuffer = await readFile(SVG_PATH)

  const web = [
    { path: join(ROOT, 'public', 'favicon-32.png'), size: 32 },
    { path: join(ROOT, 'public', 'apple-touch-icon.png'), size: 180 },
    { path: join(ROOT, 'public', 'icon-192.png'), size: 192 },
    { path: join(ROOT, 'public', 'icon-512.png'), size: 512 },
  ]

  const androidMipmaps = [
    { folder: 'mipmap-mdpi', size: 48 },
    { folder: 'mipmap-hdpi', size: 72 },
    { folder: 'mipmap-xhdpi', size: 96 },
    { folder: 'mipmap-xxhdpi', size: 144 },
    { folder: 'mipmap-xxxhdpi', size: 192 },
  ]

  /**
   * iOS AppIcon.appiconset — logical pt × scale → pixel filename
   * (Xcode "size" strings use points, e.g. 20x20 @3x → 60px)
   */
  const iosIcons = [
    { idiom: 'iphone', sizePt: '20x20', scale: '2x', px: 40, name: 'Icon-App-20x20@2x.png' },
    { idiom: 'iphone', sizePt: '20x20', scale: '3x', px: 60, name: 'Icon-App-20x20@3x.png' },
    { idiom: 'iphone', sizePt: '29x29', scale: '2x', px: 58, name: 'Icon-App-29x29@2x.png' },
    { idiom: 'iphone', sizePt: '29x29', scale: '3x', px: 87, name: 'Icon-App-29x29@3x.png' },
    { idiom: 'iphone', sizePt: '40x40', scale: '2x', px: 80, name: 'Icon-App-40x40@2x.png' },
    { idiom: 'iphone', sizePt: '40x40', scale: '3x', px: 120, name: 'Icon-App-40x40@3x.png' },
    { idiom: 'iphone', sizePt: '60x60', scale: '2x', px: 120, name: 'Icon-App-60x60@2x.png' },
    { idiom: 'iphone', sizePt: '60x60', scale: '3x', px: 180, name: 'Icon-App-60x60@3x.png' },
    { idiom: 'ipad', sizePt: '20x20', scale: '1x', px: 20, name: 'Icon-App-20x20@1x~ipad.png' },
    { idiom: 'ipad', sizePt: '20x20', scale: '2x', px: 40, name: 'Icon-App-20x20@2x~ipad.png' },
    { idiom: 'ipad', sizePt: '29x29', scale: '1x', px: 29, name: 'Icon-App-29x29@1x~ipad.png' },
    { idiom: 'ipad', sizePt: '29x29', scale: '2x', px: 58, name: 'Icon-App-29x29@2x~ipad.png' },
    { idiom: 'ipad', sizePt: '40x40', scale: '1x', px: 40, name: 'Icon-App-40x40@1x~ipad.png' },
    { idiom: 'ipad', sizePt: '40x40', scale: '2x', px: 80, name: 'Icon-App-40x40@2x~ipad.png' },
    { idiom: 'ipad', sizePt: '76x76', scale: '2x', px: 152, name: 'Icon-App-76x76@2x~ipad.png' },
    { idiom: 'ipad', sizePt: '83.5x83.5', scale: '2x', px: 167, name: 'Icon-App-83.5x83.5@2x~ipad.png' },
    { idiom: 'ios-marketing', sizePt: '1024x1024', scale: '1x', px: 1024, name: 'Icon-App-1024x1024.png' },
  ]

  const iosDir = join(ROOT, 'public', 'icons', 'ios', 'AppIcon.appiconset')
  await mkdir(iosDir, { recursive: true })

  const androidBase = join(ROOT, 'public', 'icons', 'android', 'res')
  for (const { folder } of androidMipmaps) {
    await mkdir(join(androidBase, folder), { recursive: true })
  }

  console.info(`Padding ratio: ${paddingRatio}`)

  for (const { path: outPath, size } of web) {
    const pad = Math.round(size * paddingRatio)
    const png = await renderPaddedIcon(svgBuffer, size, pad)
    await mkdir(dirname(outPath), { recursive: true })
    await png.toFile(outPath)
    console.info('Wrote', outPath.replace(ROOT + '/', ''))
  }

  for (const { folder, size } of androidMipmaps) {
    const pad = Math.round(size * paddingRatio)
    const png = await renderPaddedIcon(svgBuffer, size, pad)
    const outPath = join(androidBase, folder, 'ic_launcher.png')
    await png.toFile(outPath)
    console.info('Wrote', outPath.replace(ROOT + '/', ''))
  }

  const iosImages = []
  for (const row of iosIcons) {
    const pad = Math.round(row.px * paddingRatio)
    const png = await renderPaddedIcon(svgBuffer, row.px, pad)
    const outPath = join(iosDir, row.name)
    await png.toFile(outPath)
    iosImages.push({
      filename: row.name,
      idiom: row.idiom,
      size: row.sizePt,
      scale: row.scale,
    })
    console.info('Wrote', outPath.replace(ROOT + '/', ''))
  }

  const contentsJson = {
    images: iosImages.map(({ filename, idiom, size, scale }) => ({
      filename,
      idiom,
      size,
      scale,
    })),
    info: {
      version: 1,
      author: 'xcode',
    },
  }

  await writeFile(join(iosDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2) + '\n', 'utf8')
  console.info('Wrote public/icons/ios/AppIcon.appiconset/Contents.json')

  console.info('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
