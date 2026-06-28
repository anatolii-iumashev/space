import { db } from './index'

// Push schema to database (creates tables if not exist)
// For dev: use drizzle-kit push
// For prod: use generated migrations

export async function migrate() {
  const { sql } = await import('drizzle-orm')
  
  // Simple table creation via raw SQL (drizzle-kit push is for CLI)
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      recurrence TEXT,
      caldav_uri TEXT,
      caldav_etag TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      parent_id TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(sql`
    CREATE TABLE IF NOT EXISTS mail_sync_state (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      folder TEXT NOT NULL,
      last_uid INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  console.log('✅ Database migrated')
}
