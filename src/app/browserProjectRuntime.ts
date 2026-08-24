import { createProjectRuntime, type ProjectRuntime } from './projectRuntime'

let browserProjectRuntime: ProjectRuntime | null = null

export function getBrowserProjectRuntime(): ProjectRuntime {
  browserProjectRuntime ??= createProjectRuntime(globalThis.localStorage)
  return browserProjectRuntime
}
