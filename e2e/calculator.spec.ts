import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('@smoke loads the production calculator and legacy defaults', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Build a clear, defensible estimate.' }),
  ).toBeVisible()
  await expect(page.getByLabel('QA activity 1 name')).toHaveValue(
    'QA Analysis / Test Planning',
  )
  await expect(page.getByLabel('QA activity 6 name')).toHaveValue(
    'UAT / Release Validation Support',
  )
  await expect(page.getByRole('link', { name: 'Open legacy calculator' })).toHaveAttribute(
    'href',
    '?ui=legacy',
  )
})

test('creates, calculates, autosaves, and restores a complete estimate', async ({
  page,
}) => {
  await page.getByLabel('Project or release name').fill('Browser Verification')
  await page.getByRole('button', { name: 'Add first main item' }).click()

  await expect(
    page.getByRole('textbox', { name: /^Activity \d+ name$/ }),
  ).toHaveCount(8)
  await expect(page.getByLabel('Activity 1 name', { exact: true })).toHaveValue(
    'Requirement Analysis / Investigation',
  )

  await page.getByLabel('Activity 1 hours', { exact: true }).fill('10')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')
  await page.getByLabel('QA activity 1 hours').fill('2')
  await page.getByLabel('QA activity 1 hours').press('Tab')

  await expect(page.locator('.preview-summary')).toContainText('13.8 h')
  await expect(page.locator('.preview-save-status')).toContainText(
    'All changes saved',
    { timeout: 3_000 },
  )

  await page.reload()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Browser Verification',
  )
  await expect(page.getByLabel('Activity 1 hours', { exact: true })).toHaveValue(
    '10',
  )
  await expect(page.getByLabel('QA activity 1 hours')).toHaveValue('2')
  await expect(page.locator('.preview-summary')).toContainText('13.8 h')
})

test('creates a legacy estimation form for a new sub-item', async ({ page }) => {
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('1')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '+ Add sub-item' }).click()

  await expect(page.getByLabel('Sub-item 1 name')).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: /^Activity \d+ name$/ }),
  ).toHaveCount(8)
  await expect(page.getByLabel('Activity 1 name', { exact: true })).toHaveValue(
    'Requirement Analysis / Investigation',
  )
  await expect(page.getByText('Form total: 0 h')).toBeVisible()
})

test('calculates and restores an optional three-point estimate', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByRole('button', {
    name: 'Use three-point estimate for activity 1',
  }).click()

  for (const [name, value] of [
    ['Activity 1 optimistic hours', '4'],
    ['Activity 1 most likely hours', '10'],
    ['Activity 1 pessimistic hours', '16'],
  ] as const) {
    await page.getByLabel(name).fill(value)
    await page.getByLabel(name).press('Tab')
  }

  await expect(page.getByText('PERT expected')).toBeVisible()
  await expect(page.locator('.preview-summary')).toContainText('11.5 h')
  await expect(page.locator('.preview-save-status')).toContainText(
    'All changes saved',
    { timeout: 3_000 },
  )

  await page.reload()
  await expect(page.getByLabel('Activity 1 optimistic hours')).toHaveValue('4')
  await expect(page.getByLabel('Activity 1 most likely hours')).toHaveValue('10')
  await expect(page.getByLabel('Activity 1 pessimistic hours')).toHaveValue('16')
  await expect(page.locator('.preview-summary')).toContainText('11.5 h')
})

test('records delivery metadata and dependencies across reloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByRole('button', { name: '+ Add main item' }).click()
  await page.getByLabel('Main item 1 name').fill('Foundation')
  await page.getByLabel('Main item 2 name').fill('Billing')

  const billing = page.getByLabel('Main item 2 name').locator('xpath=ancestor::article[1]')
  await billing.getByRole('checkbox', { name: '1. Foundation' }).check()
  await page.getByRole('button', {
    name: 'Show planning details for activity 1',
  }).first().click()
  await page.getByLabel('Activity 1 delivery role').first().selectOption('Backend')
  await page.getByLabel('Activity 1 risk level').first().selectOption('high')
  await page.getByLabel('Activity 1 confidence percentage').first().fill('80')
  await page.getByLabel('Activity 1 confidence percentage').first().press('Tab')
  await page.getByLabel('Activity 1 notes').first().fill('Identity service dependency.')
  await page.getByLabel('Activity 1 hours', { exact: true }).first().fill('6')
  await page.getByLabel('Activity 1 hours', { exact: true }).first().press('Tab')

  await expect(page.locator('.role-effort-summary')).toContainText('Backend')
  await expect(page.locator('.role-effort-summary')).toContainText('6 h')
  await expect(page.locator('.preview-save-status')).toContainText(
    'All changes saved',
    { timeout: 3_000 },
  )

  await page.reload()
  await expect(page.getByLabel('Main item 2 name')).toHaveValue('Billing')
  const restoredBilling = page.getByLabel('Main item 2 name').locator('xpath=ancestor::article[1]')
  await expect(restoredBilling.getByRole('checkbox', { name: '1. Foundation' })).toBeChecked()
  await page.getByRole('button', {
    name: 'Show planning details for activity 1',
  }).first().click()
  await expect(page.getByLabel('Activity 1 delivery role').first()).toHaveValue('Backend')
  await expect(page.getByLabel('Activity 1 risk level').first()).toHaveValue('high')
  await expect(page.getByLabel('Activity 1 confidence percentage').first()).toHaveValue('80')
  await expect(page.getByLabel('Activity 1 notes').first()).toHaveValue(
    'Identity service dependency.',
  )
})

test('previews and exports provider-neutral work items', async ({ page }) => {
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Main item 1 name').fill('Billing')
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('5')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')

  const panel = page.locator('.work-item-panel')
  await expect(panel.locator('.work-item-toolbar')).toContainText('1 of 1 items')
  await panel.getByLabel('Work item 1 summary').fill('Create billing feature')
  await panel.getByRole('checkbox', {
    name: 'Generate estimation activities as child work items',
  }).check()
  await expect(panel.locator('.work-item-toolbar')).toContainText('2 of 2 items')
  await expect(panel.locator('.work-item-toolbar')).toContainText(
    '5 h assigned to exported items',
  )

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export work-item JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(
    'untitled-estimate-work-items.json',
  )
  const path = await download.path()
  expect(path).not.toBeNull()
  const content = await import('node:fs/promises').then(({ readFile }) =>
    readFile(path!, 'utf8'),
  )
  const exported = JSON.parse(content)
  expect(exported).toMatchObject({
    fileType: 'DevelopmentEstimationWorkItems',
    schemaVersion: 1,
    options: { includeEstimationActivities: true },
  })
  expect(exported.workItems).toHaveLength(2)
  expect(exported.workItems[0].summary).toBe('Create billing feature')
  expect(exported.workItems[1]).toMatchObject({
    kind: 'activity',
    parentId: exported.workItems[0].id,
    estimateHours: 5,
  })
})

test('exports a hierarchy-ready Jira CSV', async ({ page }) => {
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Main item 1 name').fill('Billing')
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('1.5')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')

  const panel = page.locator('.work-item-panel')
  await panel.getByRole('checkbox', {
    name: 'Generate estimation activities as child work items',
  }).check()
  await panel.getByLabel('Jira project or space key').fill('ct2')
  await expect(panel.getByLabel('Jira project or space key')).toHaveValue('CT2')

  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export Jira CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('untitled-estimate-jira.csv')
  const path = await download.path()
  expect(path).not.toBeNull()
  const content = await import('node:fs/promises').then(({ readFile }) =>
    readFile(path!, 'utf8'),
  )

  expect(content).toContain(
    'Issue ID,Parent ID,Project Key,Issue Type,Summary,Description,Original Estimate',
  )
  expect(content).toContain('10001,,CT2,Story,Billing')
  expect(content).toContain(
    '10002,10001,CT2,Sub-task,Requirement Analysis / Investigation',
  )
  expect(content).toContain(',5400,')
})

test('exports and reimports an editable project', async ({ page }) => {
  await page.getByLabel('Project or release name').fill('Browser Export')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^browser-export.*\.json$/)

  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  await page.getByLabel('Project or release name').fill('Changed Project')
  await page.getByLabel('Import editable estimate').setInputFiles(downloadPath!)

  await expect(page.getByRole('status').last()).toContainText(
    'Project imported successfully.',
  )
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Browser Export',
  )
})

test('resets individual sections and the complete project safely', async ({
  page,
}) => {
  await page.getByLabel('Project or release name').fill('Reset Test')
  await page.getByLabel('Risk buffer').fill('28')
  await page.getByLabel('Risk buffer').press('Tab')
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('QA activity 1 hours').fill('9')
  await page.getByLabel('QA activity 1 hours').press('Tab')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset development work breakdown' }).click()
  await expect(page.getByRole('button', { name: 'Add first main item' })).toBeVisible()
  await expect(page.getByLabel('Project or release name')).toHaveValue('Reset Test')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset QA estimation' }).click()
  await expect(page.getByLabel('QA activity 1 hours')).toHaveValue('0')
  await expect(page.getByLabel('QA activity 1 name')).toHaveValue(
    'QA Analysis / Test Planning',
  )

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset project settings' }).click()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Untitled Estimate',
  )
  await expect(page.getByLabel('Risk buffer')).toHaveValue('15')

  await page.getByLabel('Project or release name').fill('Full Reset Test')
  await page.getByRole('button', { name: 'Reset all' }).click()
  await expect(
    page.getByRole('heading', { name: 'Reset the complete project?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset everything' }).click()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Untitled Estimate',
  )
  await expect(
    page.getByRole('option', { name: /Recovery: Before full reset/ }),
  ).toHaveCount(1)
})

test('saves, compares, restores, and reuses project versions', async ({ page }) => {
  await page.getByLabel('Project or release name').fill('History Test')
  await page.getByRole('button', { name: 'Add first main item' }).click()
  await page.getByLabel('Activity 1 hours', { exact: true }).fill('10')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')

  await page.getByLabel('Snapshot name').fill('Baseline')
  await page.getByRole('button', { name: 'Save snapshot' }).click()
  await expect(page.getByRole('option', { name: /Baseline/ })).toHaveCount(1)

  await page.getByLabel('Activity 1 hours', { exact: true }).fill('18')
  await page.getByLabel('Activity 1 hours', { exact: true }).press('Tab')
  await expect(
    page.locator('.history-comparison__row').filter({ hasText: 'Development' }),
  ).toContainText('+8 h')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Restore selected' }).click()
  await expect(page.getByLabel('Activity 1 hours', { exact: true })).toHaveValue('10')
  await expect(
    page.getByRole('option', { name: /Recovery: Before snapshot restore/ }),
  ).toHaveCount(1)

  await page.getByLabel('Template name').fill('Reusable Billing')
  await page.getByRole('button', { name: 'Save template' }).click()
  await expect(page.getByText('Reusable Billing')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Reusable Billing',
  )
  await expect(page.getByLabel('Activity 1 hours', { exact: true })).toHaveValue('0')
})

test('keeps the sticky header and editor within a mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.evaluate(() => globalThis.scrollTo(0, 700))

  const header = page.locator('.preview-header')
  await expect(header).toBeVisible()
  await expect
    .poll(async () => (await header.boundingBox())?.y ?? -1)
    .toBeGreaterThanOrEqual(0)
  expect(
    await page.evaluate(() => {
      globalThis.scrollTo(100, globalThis.scrollY)
      return globalThis.scrollX
    }),
  ).toBe(0)
})

test('creates, searches, archives, and switches saved projects', async ({
  page,
}) => {
  await page.getByLabel('Project or release name').fill('Portfolio Alpha')
  await page.getByLabel('Project or release name').press('Tab')
  await expect(page.locator('.preview-save-status')).toContainText(
    'All changes saved',
    { timeout: 3_000 },
  )

  page.once('dialog', (dialog) => dialog.accept('Portfolio Beta'))
  await page.getByRole('button', { name: 'New project' }).click()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Portfolio Beta',
  )
  await expect(page.getByText('Portfolio Alpha')).toBeVisible()

  const alpha = page.locator('.workspace-project').filter({
    hasText: 'Portfolio Alpha',
  })
  await alpha.getByRole('button', { name: 'Duplicate' }).click()
  await page.getByLabel('Search projects').fill('Copy')
  await expect(page.getByText('Portfolio Alpha (Copy)', { exact: true })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page
    .locator('.workspace-project')
    .filter({ hasText: 'Portfolio Alpha (Copy)' })
    .getByRole('button', { name: 'Archive' })
    .click()

  await page.getByLabel('Search projects').fill('')
  await page.getByRole('button', { name: 'Archived' }).click()
  await expect(page.getByText('Portfolio Alpha (Copy)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restore' }).click()
  await page.getByRole('button', { name: 'Active' }).click()

  await page
    .locator('.workspace-project')
    .filter({ hasText: 'Portfolio Alpha (Copy)' })
    .getByRole('button', { name: 'Open' })
    .click()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Portfolio Alpha (Copy)',
  )

  await page.reload()
  await expect(page.getByLabel('Project or release name')).toHaveValue(
    'Portfolio Alpha (Copy)',
  )
})
