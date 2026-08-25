import { expect, test, type Page } from '@playwright/test'

async function openWorkspaceTab(page: Page, name: string) {
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

test('opens the deprecated legacy calculator recovery fallback', async ({ page }) => {
  await page.goto('./?ui=legacy')

  await expect(
    page.getByRole('heading', { name: 'Legacy v16 calculator' }),
  ).toBeVisible()
  await expect(
    page.getByText('Temporary compatibility mode'),
  ).toBeVisible()
  await expect(
    page.getByText(/newer saved v16 data is migrated automatically/i),
  ).toBeVisible()
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

test('migrates newer legacy browser storage without deleting the legacy copy', async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'developmentEstimationV4',
      JSON.stringify({
        savedAt: '2026-08-25T14:00:00.000Z',
        projectName: 'Legacy Migration Acceptance',
        buffer: '10',
        hoursPerDay: '8',
        teamSize: '1.5',
        daysPerWeek: '5',
        items: [
          {
            name: 'Legacy Billing',
            directEstimation: [{ name: 'Build', hours: '7.5' }],
            subItems: [],
          },
        ],
        qaEstimation: [{ name: 'Regression', hours: '2.5' }],
      }),
    )
  })

  await page.reload()

  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Legacy Migration Acceptance',
  )

  const stored = await page.evaluate(() => ({
    typed: localStorage.getItem('developmentEstimation.project.v1'),
    legacy: localStorage.getItem('developmentEstimationV4'),
  }))

  expect(stored.typed).not.toBeNull()
  expect(stored.legacy).not.toBeNull()
  expect(JSON.parse(stored.typed!).name).toBe('Legacy Migration Acceptance')
  expect(JSON.parse(stored.typed!).schedule.totalManpower).toBe(1.5)
  expect(JSON.parse(stored.legacy!).projectName).toBe(
    'Legacy Migration Acceptance',
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
