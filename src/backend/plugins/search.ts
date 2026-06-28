import { Elysia, t } from 'elysia'
import { db } from '../db'
import { calendarEvents, files } from '../db/schema'
import { eq, and, or, like } from 'drizzle-orm'
import { mailService } from '../services/mail'
import { authenticate } from './auth'

export const searchPlugin = new Elysia({ prefix: '/search' })

  .onBeforeHandle(async ({ jwt, headers, set }) => {
    const userId = await authenticate(jwt, headers)
    if (!userId) { set.status = 401; return { ok: false, error: 'Unauthorized' } }
  })

  .get('/', async ({ query, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const q = `%${query.q}%`
    const results: any[] = []

    // Search files
    if (query.types?.includes('files') ?? true) {
      const fileResults = await db.select().from(files)
        .where(and(eq(files.userId, userId), like(files.name, q)))
        .limit(query.limit || 20).all()

      results.push(...fileResults.map(f => ({
        type: 'file' as const, id: f.id, title: f.name,
        snippet: `${formatSize(f.size)} · ${f.mimeType}`, date: f.createdAt,
      })))
    }

    // Search events
    if (query.types?.includes('events') ?? true) {
      const eventResults = await db.select().from(calendarEvents)
        .where(and(eq(calendarEvents.userId, userId),
          or(like(calendarEvents.title, q), like(calendarEvents.description || '', q))))
        .limit(query.limit || 20).all()

      results.push(...eventResults.map(e => ({
        type: 'event' as const, id: e.id, title: e.title,
        snippet: e.description?.slice(0, 100) || '', date: e.start,
      })))
    }

    // Search mail
    if (query.types?.includes('mail') ?? true) {
      try {
        const mailResults = await mailService.search(query.q)
        results.push(...mailResults)
      } catch (e) { console.warn('Mail search failed:', e) }
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return { ok: true, data: results.slice(0, query.limit || 50) }
  }, {
    query: t.Object({
      q: t.String({ minLength: 1 }),
      types: t.Optional(t.Array(t.String())),
      limit: t.Optional(t.Integer({ default: 50 })),
    }),
  })

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
