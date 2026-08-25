import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
