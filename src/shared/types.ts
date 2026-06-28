// Shared types between backend and client

export interface User {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: Date
  end: Date
  allDay: boolean
  recurrence?: string
  caldavUri?: string
  caldavEtag?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface FileItem {
  id: string
  name: string
  key: string // S3 key
  size: number
  mimeType: string
  parentId?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface MailFolder {
  id: string
  name: string
  path: string
  count: number
  unread: number
}

export interface MailMessage {
  id: string
  uid: number
  folder: string
  from: string
  to: string[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  date: Date
  flags: string[]
  hasAttachments: boolean
  userId: string
}

export interface SearchResult {
  type: 'file' | 'mail' | 'event'
  id: string
  title: string
  snippet: string
  date: Date
}

// API response types
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}
