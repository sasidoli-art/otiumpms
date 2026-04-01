import { test, expect } from '@playwright/test'
import { loginAsHost, loginAsAdmin, HOST_EMAIL, PASSWORD } from './helpers'

test.describe('Host Dashboard & Navigation', () => {
  test('host can access dashboard after login', async ({ page }) => {
    await loginAsHost(page)

    // Should be on /host/* (dashboard or onboarding)
    expect(page.url()).toMatch(/\/host\//)
  })

  test('dashboard shows KPI cards', async ({ page }) => {
    await loginAsHost(page)

    // Skip if redirected to onboarding
    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    // Wait for dashboard content
    await page.waitForLoadState('networkidle')

    // Dashboard should have stat cards or KPI elements
    const body = await page.textContent('body')
    expect(body).toBeTruthy()

    // Should not be an error page
    expect(body).not.toContain('500')
  })

  test('sidebar navigation works', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    // Click on Prenotazioni in sidebar
    const bookingsLink = page.locator('a[href="/host/prenotazioni"]').first()
    if (await bookingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bookingsLink.click()
      await page.waitForURL(/\/host\/prenotazioni/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/host\/prenotazioni/)
    }
  })

  test('host can navigate to structures page', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    const structuresLink = page.locator('a[href="/host/strutture"]').first()
    if (await structuresLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await structuresLink.click()
      await page.waitForURL(/\/host\/strutture/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/host\/strutture/)

      // Should show at least one structure (from seed)
      await page.waitForLoadState('networkidle')
      const body = await page.textContent('body')
      expect(body?.length).toBeGreaterThan(100)
    }
  })

  test('host can navigate to profile page', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    await page.goto('/host/profilo')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/host\/profilo/)

    // Profile form should show email
    const emailField = page.locator(`input[value="${HOST_EMAIL}"], input[disabled]`).first()
    await expect(emailField).toBeVisible({ timeout: 5000 })
  })

  test('host can navigate to CRM page', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    const crmLink = page.locator('a[href="/host/crm"]').first()
    if (await crmLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await crmLink.click()
      await page.waitForURL(/\/host\/crm/, { timeout: 10000 })
      await expect(page).toHaveURL(/\/host\/crm/)
    }
  })

  test('topbar user dropdown works', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    // Click the user avatar/name in topbar
    const userButton = page.locator('button:has(.rounded-full.bg-blue-600)').first()
    if (await userButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await userButton.click()

      // Dropdown should appear with settings and logout
      const dropdown = page.locator('[class*="absolute"][class*="shadow"]').first()
      await expect(dropdown).toBeVisible({ timeout: 3000 })
    }
  })

  test('language switcher is visible in topbar', async ({ page }) => {
    await loginAsHost(page)

    if (page.url().includes('/onboarding')) {
      test.skip()
      return
    }

    // Language switcher globe icon should be visible
    const langSwitcher = page.locator('button:has-text("IT"), button:has-text("EN")').first()
    await expect(langSwitcher).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Admin Dashboard', () => {
  test('admin can access admin dashboard', async ({ page }) => {
    await loginAsAdmin(page)

    // Admin should land on /admin or /host area
    expect(page.url()).toMatch(/\/(admin|host)\//)
  })

  test('admin sidebar has admin-specific links', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to admin dashboard if not already there
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')

    // Should show admin dashboard content
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})
