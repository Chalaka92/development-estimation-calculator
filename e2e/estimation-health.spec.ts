import { expect, test } from '@playwright/test'

test('surfaces derived estimate review findings without blocking the workflow', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('tab', { name: 'Development', exact: true }).click()
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('8')
  await page.getByRole('button', {
    name: 'Show planning details for activity 1',
  }).click()
  await page.getByLabel('Activity 1 risk level').selectOption('high')
  await page.getByLabel('Activity 1 confidence percentage').fill('45')

  await page.getByRole('tab', { name: 'Review', exact: true }).click()

  await expect(
    page.getByRole('heading', { name: 'Estimation health review' }),
  ).toBeVisible()
  await expect(page.getByText('Needs review')).toBeVisible()
  await expect(page.getByText('QA effort is still zero')).toBeVisible()
  await expect(page.getByText('High-risk activities need review')).toBeVisible()
  await expect(page.getByText('Low-confidence estimates need review')).toBeVisible()
  await expect(
    page.getByText('Development delivery roles are incomplete'),
  ).toBeVisible()
  await expect(
    page.getByText('These are review prompts, not validation errors.'),
  ).toBeVisible()

  await expect(
    page.getByRole('heading', { name: 'Live estimation table' }),
  ).toBeVisible()
})
