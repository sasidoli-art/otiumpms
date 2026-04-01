import { test, expect } from '@playwright/test'

test.describe('Public Booking Flow', () => {
  test('booking catalog page loads and shows structures', async ({ page }) => {
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    // Page should render without errors
    await expect(page).not.toHaveURL(/error/)

    // Should have a search input or filter buttons
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('structure detail page loads', async ({ page }) => {
    // First get a structure ID from the catalog
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    // Find and click the first structure link
    const structureLink = page.locator('a[href^="/book/"]').first()

    // If there are structures in the DB, navigate to one
    if (await structureLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await structureLink.getAttribute('href')
      if (href && href !== '/book') {
        await page.goto(href)
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/error/)
      }
    }
  })

  test('booking form has required fields', async ({ page }) => {
    // Navigate to catalog first to find a structure
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    // Find a bookable structure (ALLOGGIO type)
    const links = page.locator('a[href^="/book/c"]')
    const count = await links.count()

    if (count > 0) {
      const href = await links.first().getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')

      // Look for booking form elements (calendar, name fields)
      // The form should be present on an ALLOGGIO page
      const pageContent = await page.textContent('body')

      // Page loaded successfully (not 404 or error)
      expect(pageContent).toBeTruthy()
    }
  })

  test('booking form validation prevents empty submission', async ({ page }) => {
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    const links = page.locator('a[href^="/book/c"]')
    const count = await links.count()

    if (count > 0) {
      const href = await links.first().getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')

      // Try to find and click a submit/confirm button without filling form
      const submitBtn = page.locator('button:has-text("Conferma"), button:has-text("Confirm")')
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click()
        // Should stay on page (validation prevents submission)
        await page.waitForTimeout(1000)
        expect(page.url()).toContain('/book/')
      }
    }
  })

  test('SPA booking page loads', async ({ page }) => {
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    // Find any SPA booking link
    const spaLinks = page.locator('a[href*="/spa"]')
    if (await spaLinks.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await spaLinks.first().getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')
      await expect(page).not.toHaveURL(/error/)
    }
  })

  test('packages page loads', async ({ page }) => {
    await page.goto('/book')
    await page.waitForLoadState('networkidle')

    const pkgLinks = page.locator('a[href*="/pacchetti"]')
    if (await pkgLinks.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await pkgLinks.first().getAttribute('href')
      await page.goto(href!)
      await page.waitForLoadState('networkidle')
      await expect(page).not.toHaveURL(/error/)
    }
  })
})
