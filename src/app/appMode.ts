export type AppMode = 'legacy' | 'react-preview'

export function resolveAppMode(search: string): AppMode {
  return new URLSearchParams(search).get('ui') === 'react'
    ? 'react-preview'
    : 'legacy'
}
