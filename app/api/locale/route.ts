import { NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/config'

export async function POST(req: Request) {
  const { locale } = await req.json()

  if (!locales.includes(locale as Locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const res = NextResponse.json({ locale })
  res.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return res
}
