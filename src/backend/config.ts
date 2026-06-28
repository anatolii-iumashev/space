import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type AppConfig = {
  paths?: {
    dataDir?: string
    filesDir?: string
  }
}

const DEFAULT_DATA_DIR = '/app/data'
const DEFAULT_FILES_DIR = '/app/files'

function mapContainerPathToProjectPath(value: string) {
  // Keep /app/* inside container, but map to ./ when running locally.
  if (value.startsWith('/app/') && process.cwd() !== '/app') {
    return `.${value.slice('/app'.length)}`
  }

  return value
}

function readConfigFile() {
  const configPath = process.env.SPACE_CONFIG_PATH || join(process.cwd(), 'space.config.json')

  if (!existsSync(configPath)) {
    return {} as AppConfig
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    return JSON.parse(raw) as AppConfig
  } catch (error) {
    console.warn('[config] Failed to read space.config.json:', error)
    return {} as AppConfig
  }
}

const config = readConfigFile()

const configuredDataDir = process.env.DATA_DIR || config.paths?.dataDir || DEFAULT_DATA_DIR
const configuredFilesDir = process.env.FILES_DIR || config.paths?.filesDir || DEFAULT_FILES_DIR

export const appPaths = {
  dataDir: mapContainerPathToProjectPath(configuredDataDir),
  filesDir: mapContainerPathToProjectPath(configuredFilesDir),
}

mkdirSync(appPaths.dataDir, { recursive: true })
mkdirSync(appPaths.filesDir, { recursive: true })
