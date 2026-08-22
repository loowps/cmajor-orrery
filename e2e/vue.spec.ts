import { expect, test } from '@playwright/test'

test('visits the app root url with the patch signed in its footer', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('footer')).toContainText('Orrery')
})
