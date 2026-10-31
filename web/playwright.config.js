import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const apiDirectory = fileURLToPath(new URL('../api/', import.meta.url))

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5173',
        testIdAttribute: 'data-test',
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
    webServer: [
        {
            command: 'npm run seed && npm run dev',
            cwd: apiDirectory,
            url: 'http://localhost:3000/api/health',
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                MONGODB_CNX: 'mongodb://127.0.0.1:27017/app-usuarios-e2e',
            },
        },
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
})
