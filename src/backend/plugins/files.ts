import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { db } from '../db'
import { files } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { fileStorage, isLocalFileStorage } from '../services/file-storage'
import { authenticate } from './auth'
import { appPaths } from '../config'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { lookup as lookupMime } from 'mime-types'

type LocalFileItem = {
  id: string
  name: string
  key: string
  size: number
  mimeType: string
  parentId: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

function encodePathId(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64url')
}

function decodePathId(value?: string | null) {
  if (!value || value === 'root') return ''
  const decoded = Buffer.from(value, 'base64url').toString('utf-8')
  const normalized = normalize(decoded).replace(/^\/+/, '')
  if (normalized.includes('..')) throw new Error('Invalid path')
  return normalized === '.' ? '' : normalized
}

function localRootPath() {
  return appPaths.filesDir
}

function toStorageKey(relativePath: string) {
  const clean = relativePath.replace(/^\/+/, '')
  return clean
}

function buildLocalUploadPath(parentPath: string, originalName: string) {
  const ext = originalName.split('.').pop() || ''
  const id = nanoid()
  const filename = ext ? `${id}.${ext}` : id

  if (parentPath) {
    return `${parentPath}/${filename}`
  }

  const now = new Date()
  const year = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${year}/${mm}${dd}/${filename}`
}

async function listLocalItems(userId: string, parentPath: string): Promise<LocalFileItem[]> {
  const root = localRootPath()
  await mkdir(root, { recursive: true })

  const targetPath = parentPath ? join(root, parentPath) : root
  await mkdir(targetPath, { recursive: true })

  const entries = await readdir(targetPath, { withFileTypes: true })
  const items: LocalFileItem[] = []

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const relPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
    const absPath = join(targetPath, entry.name)
    const st = await stat(absPath)
    const isDir = entry.isDirectory()
    const mimeValue = isDir ? 'inode/directory' : (lookupMime(entry.name) || 'application/octet-stream')

    items.push({
      id: encodePathId(relPath),
      name: entry.name,
      key: relPath,
      size: isDir ? 0 : st.size,
      mimeType: String(mimeValue),
      parentId: parentPath ? encodePathId(parentPath) : null,
      userId,
      createdAt: st.birthtime.toISOString(),
      updatedAt: st.mtime.toISOString(),
    })
  }

  return items.sort((a, b) => {
    if (a.mimeType === 'inode/directory' && b.mimeType !== 'inode/directory') return -1
    if (a.mimeType !== 'inode/directory' && b.mimeType === 'inode/directory') return 1
    return a.name.localeCompare(b.name)
  })
}

function buildFileKey(userId: string, id: string, originalName: string) {
  const ext = originalName.split('.').pop() || ''
  const filename = ext ? `${id}.${ext}` : id

  if (!isLocalFileStorage) {
    return `${userId}/${filename}`
  }

  const now = new Date()
  const year = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${year}/${mm}${dd}/${filename}`
}

export const filesPlugin = new Elysia({ prefix: '/files' })

  .onBeforeHandle(async ({ jwt, headers, set }) => {
    const userId = await authenticate(jwt, headers)
    if (!userId) { set.status = 401; return { ok: false, error: 'Unauthorized' } }
  })

  // List files
  .get('/', async ({ query, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!

    if (isLocalFileStorage) {
      try {
        const parentPath = decodePathId(query.parentId)
        const items = await listLocalItems(userId, parentPath)
        return { ok: true, data: items }
      } catch {
        return { ok: true, data: [] }
      }
    }

    const conditions = [eq(files.userId, userId)]
    if (query.parentId === 'root') {
      conditions.push(isNull(files.parentId))
    } else if (query.parentId) {
      conditions.push(eq(files.parentId, query.parentId))
    }

    const items = await db.select().from(files).where(and(...conditions)).orderBy(files.name).all()
    return { ok: true, data: items }
  }, {
    query: t.Object({ parentId: t.Optional(t.String({ default: 'root' })) }),
  })

  // Upload file
  .post('/', async ({ body, jwt, headers, set }) => {
    const userId = (await authenticate(jwt, headers))!

    if (isLocalFileStorage) {
      try {
        const parentPath = decodePathId(body.parentId || null)
        const relativePath = buildLocalUploadPath(parentPath, body.name)
        const key = toStorageKey(relativePath)
        await fileStorage.upload(key, body.file, body.file.type)

        return {
          ok: true,
          data: {
            id: encodePathId(relativePath),
            name: body.name,
            key: relativePath,
          },
        }
      } catch {
        set.status = 500
        return { ok: false, error: 'Upload failed' }
      }
    }

    const id = nanoid()
    const key = buildFileKey(userId, id, body.name)

    try { await fileStorage.upload(key, body.file, body.file.type) }
    catch (e) { set.status = 500; return { ok: false, error: 'Upload failed' } }

    await db.insert(files).values({
      id, name: body.name, key, size: body.file.size,
      mimeType: body.file.type, parentId: body.parentId || null, userId,
    })

    return { ok: true, data: { id, name: body.name, key } }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      file: t.File({ maxSize: 100 * 1024 * 1024 }),
      parentId: t.Optional(t.String()),
    }),
  })

  // Get download URL
  .get('/:id/url', async ({ params, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!

    if (isLocalFileStorage) {
      try {
        const relativePath = decodePathId(params.id)
        const localPath = join(localRootPath(), relativePath)
        const st = await stat(localPath)
        if (st.isDirectory()) return { ok: false, error: 'File not found' }

        return {
          ok: true,
          data: {
            url: `/api/files/${params.id}/content`,
            name: relativePath.split('/').pop() || relativePath,
            mimeType: String(lookupMime(relativePath) || 'application/octet-stream'),
          },
        }
      } catch {
        return { ok: false, error: 'File not found' }
      }
    }

    const file = await db.select().from(files)
      .where(and(eq(files.id, params.id), eq(files.userId, userId))).get()

    if (!file) return { ok: false, error: 'File not found' }

    try {
      const url = isLocalFileStorage
        ? `/api/files/${file.id}/content`
        : await fileStorage.getSignedUrl(file.key)
      return { ok: true, data: { url, name: file.name, mimeType: file.mimeType } }
    }
    catch { return { ok: false, error: 'Failed to generate URL' } }
  })

  .get('/:id/content', async ({ params, jwt, headers, set }) => {
    if (!isLocalFileStorage) {
      set.status = 400
      return { ok: false, error: 'Only available for local storage mode' }
    }

    const userId = (await authenticate(jwt, headers))!
    try {
      const relativePath = decodePathId(params.id)
      const key = toStorageKey(relativePath)
      const localPath = fileStorage.resolveLocalPath(key)
      const st = await stat(localPath)

      if (st.isDirectory()) {
        set.status = 404
        return { ok: false, error: 'File not found' }
      }

      set.headers['Content-Type'] = String(lookupMime(relativePath) || 'application/octet-stream')
      set.headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(relativePath.split('/').pop() || 'file')}"`
      return Bun.file(localPath)
    } catch {
      set.status = 404
      return { ok: false, error: 'File not found' }
    }
  })

  // Delete file
  .delete('/:id', async ({ params, jwt, headers, set }) => {
    const userId = (await authenticate(jwt, headers))!

    if (isLocalFileStorage) {
      try {
        const relativePath = decodePathId(params.id)
        const absPath = join(localRootPath(), relativePath)
        const st = await stat(absPath)

        if (st.isDirectory()) {
          await rm(absPath, { recursive: true, force: true })
        } else {
          const key = toStorageKey(relativePath)
          await fileStorage.delete(key)
        }

        return { ok: true }
      } catch {
        set.status = 404
        return { ok: false, error: 'File not found' }
      }
    }

    const file = await db.select().from(files)
      .where(and(eq(files.id, params.id), eq(files.userId, userId))).get()

    if (!file) return { ok: false, error: 'File not found' }

    try { await fileStorage.delete(file.key) } catch (e) { console.warn('File delete failed:', e) }
    await db.delete(files).where(eq(files.id, params.id))
    return { ok: true }
  })

  // Create folder
  .post('/folder', async ({ body, jwt, headers }) => {
    const userId = (await authenticate(jwt, headers))!

    if (isLocalFileStorage) {
      const parentPath = decodePathId(body.parentId || null)
      const folderName = normalize(body.name).replace(/^\/+|\/+$/g, '').split('/').pop() || body.name
      const relativePath = parentPath ? `${parentPath}/${folderName}` : folderName
      const absPath = join(localRootPath(), relativePath)

      await mkdir(absPath, { recursive: true })

      return {
        ok: true,
        data: {
          id: encodePathId(relativePath),
          name: folderName,
          key: relativePath,
        },
      }
    }

    const id = nanoid()

    await db.insert(files).values({
      id, name: body.name, key: `${userId}/${id}/`,
      size: 0, mimeType: 'inode/directory', parentId: body.parentId || null, userId,
    })

    return { ok: true, data: { id, name: body.name } }
  }, {
    body: t.Object({ name: t.String({ minLength: 1 }), parentId: t.Optional(t.String()) }),
  })
