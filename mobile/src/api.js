import * as SecureStore from 'expo-secure-store'

const API_ORIGIN = 'https://businessemailcategorisation-production.up.railway.app'
const BASE = `${API_ORIGIN}/api/dashboard`

const TOKEN_KEY = 'auth_token'

// SecureStore is async, so the token is mirrored in memory after loadToken()
// runs at app startup; request() reads the in-memory copy synchronously.
let token = null

export async function loadToken() {
  token = await SecureStore.getItemAsync(TOKEN_KEY)
  return token
}

export function getToken() {
  return token
}

async function setToken(value) {
  token = value
  await SecureStore.setItemAsync(TOKEN_KEY, value)
}

export async function clearToken() {
  token = null
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export async function login(username, password) {
  const res = await fetch(`${API_ORIGIN}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Invalid username or password')
  const data = await res.json()
  await setToken(data.token)
  return data.token
}

function authHeaders(extra = {}) {
  return token ? { ...extra, Authorization: `Token ${token}` } : extra
}

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: authHeaders(options.headers) })
  if (res.status === 401 || res.status === 403) {
    await clearToken()
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

export async function fetchEmails({ category, dateFrom, dateTo, requiresReview, page = 1 } = {}) {
  const params = new URLSearchParams({ page: String(page) })
  if (category) params.set('category', category)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  if (requiresReview != null) params.set('requires_review', String(requiresReview))
  const res = await request(`${BASE}/emails/?${params}`)
  if (!res.ok) throw new Error('Failed to fetch emails')
  return res.json()
}

export async function fetchEmail(id) {
  const res = await request(`${BASE}/emails/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch email')
  return res.json()
}

export async function registerDevice(pushToken) {
  const res = await request(`${API_ORIGIN}/api/notifications/devices/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: pushToken }),
  })
  if (!res.ok) throw new Error('Failed to register device')
  return res.json()
}

export async function unregisterDevice(pushToken) {
  const res = await request(`${API_ORIGIN}/api/notifications/devices/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: pushToken }),
  })
  if (!res.ok) throw new Error('Failed to unregister device')
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
