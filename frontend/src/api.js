const API_ORIGIN = import.meta.env.VITE_API_URL || ''
const BASE = `${API_ORIGIN}/api/dashboard`

const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(username, password) {
  const res = await fetch(`${API_ORIGIN}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Invalid username or password')
  const data = await res.json()
  setToken(data.token)
  return data.token
}

function authHeaders(extra = {}) {
  const token = getToken()
  return token ? { ...extra, Authorization: `Token ${token}` } : extra
}

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: authHeaders(options.headers) })
  if (res.status === 401 || res.status === 403) {
    clearToken()
    const err = new Error('Not authenticated')
    err.unauthorized = true
    throw err
  }
  return res
}

export async function fetchStats() {
  const res = await request(`${BASE}/stats/`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function fetchResponseTimes() {
  const res = await request(`${BASE}/response-times/`)
  if (!res.ok) throw new Error('Failed to fetch response times')
  return res.json()
}

export async function fetchEmails({ category, dateFrom, dateTo, requiresReview, page = 1 } = {}) {
  const params = new URLSearchParams({ page })
  if (category) params.set('category', category)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  if (requiresReview != null) params.set('requires_review', requiresReview)
  const res = await request(`${BASE}/emails/?${params}`)
  if (!res.ok) throw new Error('Failed to fetch emails')
  return res.json()
}

export async function fetchEmail(id) {
  const res = await request(`${BASE}/emails/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch email')
  return res.json()
}

export async function reclassifyEmail(id, category) {
  const res = await request(`${BASE}/emails/${id}/reclassify/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  })
  if (!res.ok) throw new Error('Failed to reclassify')
  return res.json()
}

export async function downloadExport({ category, dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  const res = await request(`${BASE}/export/?${params}`)
  if (!res.ok) throw new Error('Failed to export')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'emails.csv'
  a.click()
  URL.revokeObjectURL(url)
}
