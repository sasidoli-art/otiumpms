import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, HOST_EMAIL, PASSWORD } from './helpers'

test.describe('Login Flow', () => {
  test('shows login page with form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should stay on login and show error
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/login/)
    // Error message should appear
    const errorBox = page.locator('.bg-red-50, [class*="text-red"]')
    await expect(errorBox.first()).toBeVisible({ timeout: 5000 })
  })

  test('HOST login redirects to /host/*', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', HOST_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => url.pathname.startsWith('/host'), { timeout: 15000 })
    expect(page.url()).toMatch(/\/host\//)
  })

  test('ADMIN login redirects to /admin/* or /host/*', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    expect(page.url()).toMatch(/\/(admin|host)\//)
  })

  test('unauthenticated user is redirected to /login from /host/*', async ({ page }) => {
    await page.goto('/host/dashboard')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('unauthenticated user is redirected to /login from /admin/*', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForURL(/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })
})
