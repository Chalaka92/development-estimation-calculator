import { expect, test } from '@playwright/test'

async function openWorkspaceTab(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('tab', { name, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('@smoke exposes the checked-out application version', async ({ page }) => {
  const version = process.env.npm_package_version
  expect(version).toBeTruthy()
  await expect(
    page.getByText(`Typed React calculator · v${version}`),
  ).toBeVisible()
})

test('opens the functional legacy calculator fallback', async ({ page }) => {
  await page.goto('./?ui=legacy')

  await expect(
    page.getByRole('link', { name: 'Return to React calculator' }),
  ).toBeVisible()

  const legacy = page.frameLocator(
    'iframe[title="Development Estimation Calculator"]',
  )
  await expect(
    legacy.getByRole('heading', { name: 'Development Estimation Calculator' }),
  ).toBeVisible()
  await expect(legacy.locator('#buffer')).toHaveValue('15')
  await expect(legacy.locator('#teamSize')).toHaveValue('1')
  await expect(legacy.locator('#qaBody input').first()).toHaveValue(
    'QA Analysis / Test Planning',
  )
})

test('exports inspectable Markdown and PDF summaries', async ({ page }) => {
  await page.getByLabel('Project or release name').fill('RC Acceptance')
  await openWorkspaceTab(page, 'Development')
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Main item 1 name').fill('Billing')
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('4.5')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')
  await openWorkspaceTab(page, 'Export & Jira')

  const markdownDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Markdown', exact: true }).click()
  const markdownDownload = await markdownDownloadPromise
  expect(markdownDownload.suggestedFilename()).toBe('rc-acceptance.md')
  const markdownPath = await markdownDownload.path()
  expect(markdownPath).not.toBeNull()
  const markdown = await import('node:fs/promises').then(({ readFile }) =>
    readFile(markdownPath!, 'utf8'),
  )
  expect(markdown).toContain('# RC Acceptance')
  expect(markdown).toContain('| 1 | Billing |')
  expect(markdown).toContain('4.5 h')
  await expect(page.getByRole('status').last()).toContainText(
    'Markdown summary exported.',
  )

  const pdfDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF', exact: true }).click()
  const pdfDownload = await pdfDownloadPromise
  expect(pdfDownload.suggestedFilename()).toBe('rc-acceptance.pdf')
  const pdfPath = await pdfDownload.path()
  expect(pdfPath).not.toBeNull()
  const pdf = await import('node:fs/promises').then(({ readFile }) =>
    readFile(pdfPath!),
  )
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.length).toBeGreaterThan(1_000)
  await expect(page.getByRole('status').last()).toContainText(
    'PDF summary exported.',
  )
})
