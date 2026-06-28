import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Calendar events
export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  start: text('start').notNull(), // ISO string
  end: text('end').notNull(),
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
  recurrence: text('recurrence'),
  caldavUri: text('caldav_uri'),
  caldavEtag: text('caldav_etag'),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// Files metadata (actual files stored in S3)
export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(), // S3 object key
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  parentId: text('parent_id'), // null = root
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// Mail sync state
export const mailSyncState = sqliteTable('mail_sync_state', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  folder: text('folder').notNull(),
  lastUid: integer('last_uid').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
