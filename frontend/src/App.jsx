import { useState, useEffect, useCallback } from 'react'
import { fetchStats, fetchResponseTimes, fetchEmails, fetchEmail, reclassifyEmail, exportUrl } from './api'
import MetricCards from './components/MetricCards'
import CategoryChart from './components/CategoryChart'
import EmailTable from './components/EmailTable'
import EmailDetail from './components/EmailDetail'

const CATEGORIES = [
  'IT Technical', 'Marketing', 'Tax', 'Others', 'No Action Required', 'Unclassified',
]

export default function App() {
  const [stats, setStats] = useState(null)
  const [responseTimes, setResponseTimes] = useState([])
  const [emails, setEmails] = useState({ results: [], count: 0 })
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [filters, setFilters] = useState({ category: '', dateFrom: '', dateTo: '', requiresReview: null })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([fetchStats(), fetchResponseTimes()])
      setStats(s)
      setResponseTimes(t)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEmails({ ...filters, page })
      setEmails(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadEmails() }, [loadEmails])

  const handleSelectEmail = async (id) => {
    try {
      setSelectedEmail(await fetchEmail(id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleReclassify = async (id, category) => {
    await reclassifyEmail(id, category)
    setSelectedEmail(null)
    await Promise.all([loadStats(), loadEmails()])
  }

  const overallAvg = responseTimes.length
    ? (responseTimes.reduce((s, r) => s + r.avg_minutes, 0) / responseTimes.length).toFixed(1)
    : null

  const setFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Email Triage Dashboard</h1>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {stats && (
          <MetricCards
            totalEmails={stats.total_emails}
            avgResponseTime={overallAvg}
            accuracyRate={stats.accuracy_rate}
            pendingReview={stats.pending_review}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Category Breakdown</p>
            {stats && <CategoryChart data={stats.by_category} />}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">Filters</p>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
                value={filters.category}
                onChange={e => setFilter('category', e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                value={filters.dateFrom}
                onChange={e => setFilter('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                value={filters.dateTo}
                onChange={e => setFilter('dateTo', e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={filters.requiresReview === true}
                onChange={e => setFilter('requiresReview', e.target.checked ? true : null)}
              />
              <span className="text-sm text-gray-600">Pending review only</span>
            </label>

            <a
              href={exportUrl({ category: filters.category, dateFrom: filters.dateFrom, dateTo: filters.dateTo })}
              download
              className="block w-full text-center text-sm bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-700 transition-colors"
            >
              Export CSV
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <EmailTable
            emails={emails.results}
            total={emails.count}
            page={page}
            onPageChange={setPage}
            onSelect={handleSelectEmail}
            loading={loading}
          />
        </div>
      </main>

      {selectedEmail && (
        <EmailDetail
          email={selectedEmail}
          categories={CATEGORIES}
          onReclassify={handleReclassify}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  )
}
