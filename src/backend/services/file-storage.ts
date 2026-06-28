import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { appPaths } from '../config'
import { s3Service } from './s3'

const configuredStorage = (process.env.FILE_STORAGE || '').toLowerCase()
export const fileStorageMode = isLocalMode() ? 'local' : 's3'

function isLocalMode() {
  return configuredStorage === 'local'
    || (!configuredStorage && (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY))
}

export const isLocalFileStorage = isLocalMode()

function resolveLocalPath(key: string) {
  const safeKey = normalize(key).replace(/^\.\.(\/|\\|$)/, '')
  return join(appPaths.filesDir, safeKey)
}

export const fileStorage = {
  async upload(key: string, body: File | Blob, contentType?: string) {
    if (!isLocalFileStorage) {
      return s3Service.upload(key, body, contentType)
    }

    const fullPath = resolveLocalPath(key)
    await mkdir(dirname(fullPath), { recursive: true })
    const buffer = Buffer.from(await body.arrayBuffer())
    await writeFile(fullPath, buffer)
  },

  async getSignedUrl(key: string, expiresIn = 3600) {
    if (!isLocalFileStorage) {
      return s3Service.getSignedUrl(key, expiresIn)
    }

    return key
  },

  async delete(key: string) {
    if (!isLocalFileStorage) {
      return s3Service.delete(key)
    }

    const fullPath = resolveLocalPath(key)
    await rm(fullPath, { force: true })
  },

  resolveLocalPath,
}
