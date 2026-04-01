import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'
import it from '../messages/it.json'
import en from '../messages/en.json'

const allMessages: Record<string, typeof it> = { it, en }

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale

  return { locale, messages: allMessages[locale] ?? allMessages.it }
})
