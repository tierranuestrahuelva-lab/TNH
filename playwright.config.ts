import { defineConfig } from '@playwright/test'

const comun = { locale: 'es-ES', timezoneId: 'Europe/Madrid', baseURL: 'http://localhost:5179' }

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'gauntlet/e2e.json' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'movil', use: { ...comun, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: 'escritorio', use: { ...comun, viewport: { width: 1366, height: 900 } } },
  ],
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
