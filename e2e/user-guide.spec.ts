import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('opens the built-in user guide and exposes the core workflow topics', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'User Guide', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'User guide', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Quick start', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Recommended workflow', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Estimation basics', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Data safety', exact: true }),
  ).toBeVisible()

  await page.getByText('Export, backups, and Jira', { exact: true }).click()
  await expect(
    page.getByText('Direct Jira authentication and server-backed issue creation'),
  ).toBeVisible()
})

test('keeps the header guide modal inside a short viewport and loads its visual reference', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1072, height: 410 })

  const reset = page.getByRole('button', { name: 'Reset all' })
  const help = page.getByRole('button', { name: 'Open user guide' })
  await expect(reset).toBeVisible()
  await expect(help).toBeVisible()

  await help.click()

  const backdrop = page.locator('.user-guide-backdrop')
  const dialog = page.getByRole('dialog', { name: 'User guide' })
  await expect(backdrop).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close user guide' })).toBeVisible()

  expect(
    await backdrop.evaluate((element) => element.parentElement === document.body),
  ).toBe(true)

  const backdropBox = await backdrop.boundingBox()
  expect(backdropBox).not.toBeNull()
  expect(backdropBox!.x).toBe(0)
  expect(backdropBox!.y).toBe(0)
  expect(backdropBox!.width).toBe(1072)
  expect(backdropBox!.height).toBe(410)

  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(410)

  await page.getByRole('button', { name: 'Project setup' }).click()
  const guideImage = page.getByRole('img', {
    name: 'Project settings area of the development estimation calculator',
  })
  await expect(guideImage).toBeVisible()
  expect(
    await guideImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(help).toBeFocused()
})
