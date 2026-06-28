import type { CalendarEvent } from '../../shared/types'

// CalDAV service — connects to any standard CalDAV server
// Google Calendar, Nextcloud, Apple Calendar, etc.

const CALDAV_URL = process.env.CALDAV_URL
const CALDAV_USER = process.env.CALDAV_USER
const CALDAV_PASS = process.env.CALDAV_PASS

// Basic CalDAV operations using raw HTTP
// For production, consider using `caldav` npm package

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`${CALDAV_USER}:${CALDAV_PASS}`).toString('base64')
}

async function caldavRequest(path: string, method: string, body?: string) {
  if (!CALDAV_URL) throw new Error('CalDAV not configured')

  const url = `${CALDAV_URL}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/xml; charset=utf-8',
      ...(body ? { Depth: '1' } : {}),
    },
    body: body || undefined,
  })

  if (!res.ok) {
    throw new Error(`CalDAV ${method} ${path} failed: ${res.status}`)
  }

  return res
}

function generateICS(event: {
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
  location?: string
  recurrence?: string
}): string {
  const uid = crypto.randomUUID()
  const dtStart = event.allDay ? event.start.split('T')[0].replace(/-/g, '') : event.start
  const dtEnd = event.allDay ? event.end.split('T')[0].replace(/-/g, '') : event.end
  const dtType = event.allDay ? ';VALUE=DATE' : ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Space//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART${dtType}:${dtStart}`,
    `DTEND${dtType}:${dtEnd}`,
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    event.recurrence ? `RRULE:${event.recurrence}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export const caldavService = {
  async createEvent(event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!CALDAV_URL) return null

    const ics = generateICS(event)
    const res = await caldavRequest('/calendars/default/', 'PUT', ics)

    return {
      uri: res.headers.get('location') || undefined,
      etag: res.headers.get('etag') || undefined,
    }
  },

  async updateEvent(uri: string, data: any) {
    if (!CALDAV_URL) return
    await caldavRequest(uri, 'PUT', generateICS(data))
  },

  async deleteEvent(uri: string) {
    if (!CALDAV_URL) return
    await caldavRequest(uri, 'DELETE')
  },

  async syncAll(userId: string): Promise<Partial<CalendarEvent>[]> {
    if (!CALDAV_URL) return []

    // PROPFIND to list all events
    const query = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    const res = await caldavRequest('/calendars/default/', 'REPORT', query)
    const text = await res.text()

    // Parse XML response — for production use a proper XML parser
    // This returns raw events, parsing would extract VEVENT data
    console.log('CalDAV sync response length:', text.length)
    return []
  },
}
