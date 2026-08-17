import { expect, test } from '@playwright/test'

test('visits the app root url with included patch title', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header')).toContainText('Orrery')
})
