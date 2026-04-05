import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB after encoding

/**
 * POST /api/host/upload
 * Accepts { image: string (base64 data URL), context: string }
 * Validates format and size, returns { url: string } (the data URL itself).
 *
 * For MVP we store base64 in DB. This endpoint serves as a validation
 * gateway and future migration point to R2/S3.
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  let body: { image?: string; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { image, context } = body

  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Campo image richiesto' }, { status: 422 })
  }

  // Validate data URL format
  if (!image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Formato immagine non valido (richiesto data:image/...)' }, { status: 422 })
  }

  // Check size — base64 string length approximates to ~(bytes * 4/3)
  const commaIdx = image.indexOf(',')
  if (commaIdx === -1) {
    return NextResponse.json({ error: 'Data URL malformato' }, { status: 422 })
  }

  const base64Part = image.slice(commaIdx + 1)
  const sizeBytes = Math.ceil((base64Part.length * 3) / 4)

  if (sizeBytes > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Immagine troppo grande: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB (max 2MB)` },
      { status: 422 }
    )
  }

  return NextResponse.json({ url: image })
}
