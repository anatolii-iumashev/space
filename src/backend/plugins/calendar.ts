import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { calendarEvents } from '../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { caldavService } from '../services/caldav'
import { authenticate } from './auth'

export const calendarPlugin = new Elysia({ prefix: '/calendar' })

  // Auth guard for all calendar routes
  .onBeforeHandle(async ({ jwt, headers, set }) => {
    const userId = await authenticate(jwt, headers)
    if (!userId) {
      set.status = 401
      return { ok: false, error: 'Unauthorized' }
    }
  })

  // List events
  .get('/', async ({ query, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const conditions = [eq(calendarEvents.userId, userId)]
    if (query.from) conditions.push(gte(calendarEvents.start, query.from))
    if (query.to) conditions.push(lte(calendarEvents.start, query.to))

    const events = await db.select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(desc(calendarEvents.start))
      .all()

    return { ok: true, data: events }
  }, {
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  })

  // Get single event
  .get('/:id', async ({ params, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const event = await db.select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, params.id), eq(calendarEvents.userId, userId)))
      .get()

    if (!event) return { ok: false, error: 'Event not found' }
    return { ok: true, data: event }
  })

  // Create event
  .post('/', async ({ body, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const id = nanoid()

    let caldavUri: string | undefined
    let caldavEtag: string | undefined
    try {
      const result = await caldavService.createEvent(body)
      caldavUri = result?.uri
      caldavEtag = result?.etag
    } catch (e) {
      console.warn('CalDAV sync failed:', e)
    }

    await db.insert(calendarEvents).values({
      id,
      title: body.title,
      description: body.description,
      location: body.location,
      start: body.start,
      end: body.end,
      allDay: body.allDay ?? false,
      recurrence: body.recurrence,
      caldavUri,
      caldavEtag,
      userId,
    })

    return { ok: true, data: { id } }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      location: t.Optional(t.String()),
      start: t.String(),
      end: t.String(),
      allDay: t.Optional(t.Boolean()),
      recurrence: t.Optional(t.String()),
    }),
  })

  // Update event
  .put('/:id', async ({ params, body, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const event = await db.select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, params.id), eq(calendarEvents.userId, userId)))
      .get()

    if (!event) return { ok: false, error: 'Event not found' }

    await db.update(calendarEvents)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(calendarEvents.id, params.id))

    if (event.caldavUri) {
      try { await caldavService.updateEvent(event.caldavUri, { ...body, etag: event.caldavEtag }) }
      catch (e) { console.warn('CalDAV update failed:', e) }
    }

    return { ok: true }
  }, {
    body: t.Partial(t.Object({
      title: t.String(),
      description: t.String(),
      location: t.String(),
      start: t.String(),
      end: t.String(),
      allDay: t.Boolean(),
      recurrence: t.String(),
    })),
  })

  // Delete event
  .delete('/:id', async ({ params, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    const event = await db.select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, params.id), eq(calendarEvents.userId, userId)))
      .get()

    if (!event) return { ok: false, error: 'Event not found' }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, params.id))

    if (event.caldavUri) {
      try { await caldavService.deleteEvent(event.caldavUri) }
      catch (e) { console.warn('CalDAV delete failed:', e) }
    }

    return { ok: true }
  })

  // Sync from CalDAV
  .post('/sync', async ({ jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!
    try {
      const synced = await caldavService.syncAll(userId)
      return { ok: true, data: { synced: synced.length } }
    } catch (e) {
      return { ok: false, error: 'CalDAV sync failed: ' + (e as Error).message }
    }
  })
