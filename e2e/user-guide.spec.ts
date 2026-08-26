import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('opens the user guide from the header after Reset all', async ({ page }) => {
  const headerButtons = page.locator('.calculator-header__actions > button')
  await expect(headerButtons).toHaveCount(2)
  await expect(headerButtons.nth(0)).toHaveText('Reset all')
  await expect(headerButtons.nth(1)).toHaveAccessibleName('Open user guide')

  const help = page.getByRole('button', { name: 'Open user guide' })
  await help.click()

  const dialog = page.getByRole('dialog', { name: 'User guide' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Getting started' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Review the estimate' }).click()
  await expect(dialog.getByRole('heading', { name: 'Review the estimate' })).toBeVisible()
  await expect(dialog.getByText(/Health findings are advisory/i)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(help).toBeFocused()
})
