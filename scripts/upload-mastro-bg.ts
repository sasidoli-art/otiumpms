import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const srcPath = 'C:/PROGETTI/OTIUM/otium grafic/closeup-view-of-boats-on-a-colorful-residential-bu-2026-03-18-08-03-46-utc.jpg'
  const HOST_ID = 'cmnzwtsbg0003rbwfne2ees20' // Mastroberardino

  // Step 1: resize + compress
  // Target: max 1600px lato lungo, JPEG quality 78 → tipicamente 200-400 KB
  const buf = await sharp(srcPath)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  const sizeKB = Math.round(buf.length / 1024)
  console.log(`Compressed size: ${sizeKB} KB`)

  if (buf.length > 500 * 1024) {
    console.warn('⚠ over 500KB, retrying lower quality')
    const buf2 = await sharp(srcPath)
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer()
    console.log(`Retry size: ${Math.round(buf2.length / 1024)} KB`)
    buf.set(buf2)
  }

  const dataUri = `data:image/jpeg;base64,${buf.toString('base64')}`
  console.log(`Data URI length: ${dataUri.length} chars`)

  // Step 2: update splashConfig
  const host = await p.host.findUnique({ where: { id: HOST_ID }, select: { splashConfig: true } })
  if (!host) throw new Error('host not found')

  const current = (host.splashConfig ?? {}) as Record<string, unknown>
  const updated = {
    ...current,
    sfondoImmagineUrl: dataUri,
  }

  await p.host.update({
    where: { id: HOST_ID },
    data: { splashConfig: updated },
  })
  console.log('✓ Mastroberardino splashConfig.sfondoImmagineUrl aggiornato')
}

main().catch(console.error).finally(() => p.$disconnect())
