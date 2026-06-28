// API client for Space backend

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('space_token')
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  })

  const raw = await res.text()
  let data: any = null

  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      if (!res.ok) {
        throw new Error(raw || `HTTP ${res.status}`)
      }
      throw new Error('Invalid JSON response from API')
    }
  }

  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

// Auth
export const auth = {
  register: (email: string, name: string, password: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),

  login: async (email: string, password: string) => {
    const res = await request<{ ok: boolean; data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('space_token', res.data.token)
    return res.data.user
  },

  logout: () => {
    localStorage.removeItem('space_token')
  },

  isLoggedIn: () => !!getToken(),
}

// Calendar
export const calendar = {
  list: (params?: { from?: string; to?: string }) =>
    request<{ ok: boolean; data: any[] }>(`/calendar${params ? '?' + new URLSearchParams(params as any) : ''}`),

  get: (id: string) =>
    request<{ ok: boolean; data: any }>(`/calendar/${id}`),

  create: (data: { title: string; description?: string; location?: string; start: string; end: string; allDay?: boolean; recurrence?: string }) =>
    request<{ ok: boolean; data: { id: string } }>('/calendar', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    request('/calendar/' + id, { method: 'PUT', body: JSON.stringify(data) }),

  remove: (id: string) =>
    request('/calendar/' + id, { method: 'DELETE' }),

  sync: () =>
    request<{ ok: boolean; data: { synced: number } }>('/calendar/sync', { method: 'POST' }),
}

// Files
export const files = {
  list: (parentId?: string) =>
    request<{ ok: boolean; data: any[] }>(`/files${parentId && parentId !== 'root' ? '?parentId=' + parentId : ''}`),

  upload: async (file: File, parentId?: string) => {
    const token = getToken()
    const formData = new FormData()
    formData.append('name', file.name)
    formData.append('file', file)
    if (parentId) formData.append('parentId', parentId)

    const res = await fetch(`${BASE}/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    return res.json()
  },

  getUrl: (id: string) =>
    request<{ ok: boolean; data: { url: string; name: string } }>(`/files/${id}/url`),

  createFolder: (name: string, parentId?: string) =>
    request('/files/folder', { method: 'POST', body: JSON.stringify({ name, parentId }) }),

  remove: (id: string) =>
    request('/files/' + id, { method: 'DELETE' }),
}

// Search
export const search = {
  query: (q: string, types?: string[]) =>
    request<{ ok: boolean; data: any[] }>(`/search?q=${encodeURIComponent(q)}${types ? types.map(t => `&types=${t}`).join('') : ''}`),
}

// Mail
export const mail = {
  folders: () =>
    request<{ ok: boolean; data: any[] }>('/mail/folders'),

  messages: (folder: string, page = 1, pageSize = 25) =>
    request<{ ok: boolean; data: any[] }>(`/mail/${folder}?page=${page}&pageSize=${pageSize}`),

  getMessage: (folder: string, uid: number) =>
    request<{ ok: boolean; data: any }>(`/mail/${folder}/${uid}`),

  send: (data: { to: string[]; subject: string; body: string; html?: string }) =>
    request('/mail/send', { method: 'POST', body: JSON.stringify(data) }),

  markRead: (folder: string, uid: number, read: boolean) =>
    request(`/mail/${folder}/${uid}/read`, { method: 'POST', body: JSON.stringify({ read }) }),

  delete: (folder: string, uid: number) =>
    request(`/mail/${folder}/${uid}`, { method: 'DELETE' }),

  move: (folder: string, uid: number, to: string) =>
    request(`/mail/${folder}/${uid}/move`, { method: 'POST', body: JSON.stringify({ to }) }),
}

export const config = {
  get: () => request<{ ok: boolean; data: { registrationEnabled: boolean } }>('/config'),
}

export const api = {
  auth,
  calendar,
  files,
  mail,
  search,
  config,
}
