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
