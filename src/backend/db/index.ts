import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'
import { join } from 'node:path'
import { appPaths } from '../config'

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || join(appPaths.dataDir, 'space.db')

const sqlite = new Database(dbPath, { strict: true })
sqlite.exec('PRAGMA journal_mode = WAL')
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
