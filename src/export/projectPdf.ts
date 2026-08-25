import { jsPDF } from 'jspdf'
import {
  calculateEstimate,
  calculateRoleEffort,
} from '../domain/calculations'
import type { EstimationProject } from '../domain/estimation'
import { calculateActivityHours } from '../domain/calculations'
import {
  createLiveEstimateRows,
  createActivityDetailRows,
  createDependencyDetailRows,
  formatExportNumber,
} from './projectExport'

export function createProjectPdf(project: EstimationProject): ArrayBuffer {
  const document = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const pageHeight = document.internal.pageSize.getHeight()
  const margin = 44
  const contentWidth = pageWidth - margin * 2
  let y = 50

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return
    document.addPage()
    y = margin
  }

  const text = (
    value: string,
    size = 10,
    style: 'normal' | 'bold' = 'normal',
    indent = 0,
  ) => {
    document.setFont('helvetica', style)
    document.setFontSize(size)
    const lines = document.splitTextToSize(value, contentWidth - indent)
    ensureSpace(lines.length * (size + 3))
    document.text(lines, margin + indent, y)
    y += lines.length * (size + 3)
  }

  const section = (title: string) => {
    ensureSpace(34)
    y += 10
    document.setDrawColor(218, 223, 234)
    document.line(margin, y, pageWidth - margin, y)
    y += 20
    text(title, 13, 'bold')
    y += 5
  }

  document.setProperties({
    title: `${project.name} - Development Estimate`,
    subject: 'Development and QA estimation summary',
  })

  text(project.name, 21, 'bold')
  text('Development Estimation Summary', 10)

  section('Live Estimation Table')
  for (const row of createLiveEstimateRows(project)) {
    const label = row.subItem || row.mainItem
    const labelLines = document.splitTextToSize(label, contentWidth - 120)
    const rowHeight = Math.max(19, labelLines.length * 11 + 5)
    ensureSpace(rowHeight)
    document.setFont('helvetica', row.subItem ? 'normal' : 'bold')
    document.setFontSize(9)
    document.text(row.number, margin, y)
    document.text(labelLines, margin + 38, y)
    document.text(
      `${formatExportNumber(row.hours)} h`,
      pageWidth - margin,
      y,
      { align: 'right' },
    )
    y += rowHeight
  }

  section('QA Estimation')
  if (project.qaActivities.length === 0) {
    text('No QA activities.', 9)
  } else {
    project.qaActivities.forEach((activity, index) => {
      const activityLines = document.splitTextToSize(
        activity.name,
        contentWidth - 120,
      )
      const rowHeight = Math.max(19, activityLines.length * 11 + 5)
      ensureSpace(rowHeight)
      document.setFont('helvetica', 'normal')
      document.setFontSize(9)
      document.text(String(index + 1), margin, y)
      document.text(activityLines, margin + 38, y)
      document.text(
        `${formatExportNumber(calculateActivityHours(activity))} h`,
        pageWidth - margin,
        y,
        { align: 'right' },
      )
      y += rowHeight
    })
  }

  section('Effort by Role')
  const roleEffort = calculateRoleEffort(project)
  if (roleEffort.length === 0) {
    text('No estimated role effort.', 9)
  } else {
    roleEffort.forEach((entry) => {
      ensureSpace(18)
      document.setFont('helvetica', 'normal')
      document.setFontSize(9)
      document.text(entry.role, margin, y)
      document.text(
        `${formatExportNumber(entry.hours)} h`,
        pageWidth - margin,
        y,
        { align: 'right' },
      )
      y += 18
    })
  }

  section('Activity Planning Details')
  for (const { path, activity, hours } of createActivityDetailRows(project)) {
    const metadata = [
      activity.role || (path === 'QA' ? 'QA' : 'Unassigned'),
      activity.riskLevel ? `${activity.riskLevel} risk` : 'risk not set',
      activity.confidencePercentage === undefined
        ? 'confidence not set'
        : `${formatExportNumber(activity.confidencePercentage)}% confidence`,
    ].join(' · ')
    text(`${path} / ${activity.name}`, 9, 'bold')
    text(`${metadata} · ${formatExportNumber(hours)} h`, 8)
    if (activity.notes?.trim()) text(activity.notes, 8, 'normal', 10)
    y += 4
  }

  section('Dependencies')
  const dependencies = createDependencyDetailRows(project)
  if (dependencies.length === 0) {
    text('No dependencies recorded.', 9)
  } else {
    dependencies.forEach((entry) => {
      text(`${entry.workItem} depends on ${entry.dependsOn}`, 9)
      y += 2
    })
  }

  const summary = calculateEstimate(project)
  section('Estimate Summary')
  const summaryLines = [
    ['Development', `${formatExportNumber(summary.developmentHours)} h`],
    ['QA', `${formatExportNumber(summary.qaHours)} h`],
    [
      `Risk buffer (${formatExportNumber(summary.riskBufferPercentage)}%)`,
      `${formatExportNumber(summary.riskBufferHours)} h`,
    ],
    ['Final estimate', `${formatExportNumber(summary.finalHours)} h`],
    ['Delivery', `${formatExportNumber(summary.deliveryWorkingDays)} working days`],
    ['Business weeks', formatExportNumber(summary.businessWeeks)],
    ['Team', `${formatExportNumber(summary.totalManpower)} FTE`],
  ]

  summaryLines.forEach(([label, value], index) => {
    ensureSpace(22)
    document.setFont('helvetica', index === 3 ? 'bold' : 'normal')
    document.setFontSize(index === 3 ? 11 : 9)
    document.text(label, margin, y)
    document.text(value, pageWidth - margin, y, { align: 'right' })
    y += index === 3 ? 23 : 18
  })

  return document.output('arraybuffer')
}
