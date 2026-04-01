import { type Page, expect } from '@playwright/test'

/** Seed credentials */
export const ADMIN_EMAIL = 'admin@otiumweek.it'
export const HOST_EMAIL = 'host@otiumweek.it'
export const PASSWORD = 'Otium2025!'

/** Login via the /login page and wait for redirect */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

/** Login as HOST and land on /host/dashboard */
export async function loginAsHost(page: Page) {
  await login(page, HOST_EMAIL, PASSWORD)
  // Host may redirect to onboarding or dashboard
  await page.waitForLoadState('networkidle')
}

/** Login as ADMIN and land on /admin/dashboard */
export async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, PASSWORD)
  await page.waitForLoadState('networkidle')
}

/** Assert page has no console errors (ignoring known warnings) */
export function expectNoConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore known non-critical errors
      if (text.includes('hydration') || text.includes('favicon')) return
      errors.push(text)
    }
  })
  return errors
}
