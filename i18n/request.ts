import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'
import it from '../messages/it.json'
import en from '../messages/en.json'

const allMessages: Record<string, typeof it> = { it, en }

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale

  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('locale')?.value
    if (raw && locales.includes(raw as Locale)) {
      locale = raw as Locale
    }
  } catch {
    // During static prerendering, cookies() is not available — use default
  }

  return { locale, messages: allMessages[locale] ?? allMessages.it }
})
