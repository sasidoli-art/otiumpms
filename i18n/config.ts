export const locales = ['it', 'en', 'de', 'fr'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'it'
