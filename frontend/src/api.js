const API_ORIGIN = import.meta.env.VITE_API_URL || ''
const BASE = `${API_ORIGIN}/api/dashboard`

export async function fetchStats() {
  const res = await fetch(`${BASE}/stats/`)
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

export async function fetchResponseTimes() {
  const res = await fetch(`${BASE}/response-times/`)
  if (!res.ok) throw new Error('Failed to fetch response times')
  return res.json()
}

export async function fetchEmails({ category, dateFrom, dateTo, requiresReview, page = 1 } = {}) {
  const params = new URLSearchParams({ page })
  if (category) params.set('category', category)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  if (requiresReview != null) params.set('requires_review', requiresReview)
  const res = await fetch(`${BASE}/emails/?${params}`)
  if (!res.ok) throw new Error('Failed to fetch emails')
  return res.json()
}

export async function fetchEmail(id) {
  const res = await fetch(`${BASE}/emails/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch email')
  return res.json()
}

export async function reclassifyEmail(id, category) {
  const res = await fetch(`${BASE}/emails/${id}/reclassify/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category }),
  })
  if (!res.ok) throw new Error('Failed to reclassify')
  return res.json()
}

export function exportUrl({ category, dateFrom, dateTo } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (dateFrom) params.set('date_from', dateFrom)
  if (dateTo) params.set('date_to', dateTo)
  return `${BASE}/export/?${params}`
}