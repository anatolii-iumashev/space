import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { staticPlugin } from '@elysiajs/static'
// import { websocket } from '@elysiajs/websocket'
import { migrate } from './db/migrate'
import { authPlugin, bootstrapDefaultUser } from './plugins/auth'
import { calendarPlugin } from './plugins/calendar'
import { filesPlugin } from './plugins/files'
import { mailPlugin } from './plugins/mail'
import { searchPlugin } from './plugins/search'
import { appPaths } from './config'
import { fileStorageMode } from './services/file-storage'

await migrate()
await bootstrapDefaultUser()

const app = new Elysia({ prefix: '/api' })
  // Global middleware
  .use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3001' }))
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET || 'dev-secret' }))
  // .use(websocket()) // TODO: needs compatible version

  .use(authPlugin)
  .use(calendarPlugin)
  .use(filesPlugin)
  .use(mailPlugin)
  .use(searchPlugin)

  // Public config (no auth required)
  .get('/config', () => ({
    ok: true,
    data: {
      registrationEnabled: process.env.APP_REGISTRATION_ENABLED === 'true',
    },
  }))

  // Health check
  .get('/health', () => ({
    ok: true,
    ts: new Date().toISOString(),
    storageMode: fileStorageMode,
    filesDir: appPaths.filesDir,
  }))

  // Global error handler
  .onError(({ code, error, set }) => {
    console.error(`[${code}]`, error)
    set.status = code === 'VALIDATION' ? 400 : 500
    return { ok: false, error: error.message || 'Internal error' }
  })
  .listen(process.env.PORT || 3000)

console.log(`🚀 Space API running at http://${app.server!.hostname}:${app.server!.port}`)

export type App = typeof app
