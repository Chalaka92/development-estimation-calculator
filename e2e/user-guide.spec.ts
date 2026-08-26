import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('uses the header Help drawer as the single user guide entry point', async ({
  page,
}) => {
  await expect(page.getByRole('tab', { name: 'User Guide', exact: true })).toHaveCount(0)

  const help = page.getByRole('button', { name: 'Open user guide' })
  await help.click()

  const drawer = page.getByRole('dialog', { name: 'User guide' })
  await expect(drawer).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible()

  await page.getByRole('button', { name: 'Estimation basics' }).click()
  await expect(page.getByText(/PERT expected-hours formula/i)).toBeVisible()

  await page.getByRole('button', { name: 'Data safety' }).click()
  await expect(page.getByText(/Historical v16 editable exports/i)).toBeVisible()
})

test('keeps the right-side guide drawer inside a short viewport and loads its visual reference', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1072, height: 410 })

  const reset = page.getByRole('button', { name: 'Reset all' })
  const help = page.getByRole('button', { name: 'Open user guide' })
  await expect(reset).toBeVisible()
  await expect(help).toBeVisible()

  await help.click()

  const backdrop = page.locator('.user-guide-backdrop')
  const drawer = page.getByRole('dialog', { name: 'User guide' })
  await expect(backdrop).toBeVisible()
  await expect(drawer).toBeVisible()
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

  const drawerBox = await drawer.boundingBox()
  expect(drawerBox).not.toBeNull()
  expect(drawerBox!.y).toBe(0)
  expect(drawerBox!.height).toBe(410)
  expect(drawerBox!.x + drawerBox!.width).toBe(1072)
  expect(drawerBox!.x).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Project setup' }).click()
  const guideImage = page.getByRole('img', {
    name: 'Project settings area of the development estimation calculator',
  })
  await expect(guideImage).toBeVisible()
  expect(
    await guideImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(help).toBeFocused()
})
