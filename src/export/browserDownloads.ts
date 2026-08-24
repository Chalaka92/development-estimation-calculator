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

export async function copyTextToClipboard(content: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.readOnly = true
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand?.('copy') ?? false
  textarea.remove()
  if (!copied) {
    throw new Error('Clipboard access is not available in this browser.')
  }
}

export function printCurrentPage(): void {
  globalThis.print()
}
