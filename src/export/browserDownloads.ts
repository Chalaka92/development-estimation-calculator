export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadText(
  content: string,
  filename: string,
  type: string,
): void {
  downloadBlob(new Blob([content], { type }), filename)
}
