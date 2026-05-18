import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchStats, fetchEmails, fetchEmail, reclassifyEmail, exportUrl } from './api'
import MetricCards from './components/MetricCards'
import BarList from './components/BarList'
import EmailTable from './components/EmailTable'
import EmailDetail from './components/EmailDetail'

const CATEGORIES = ['IT Technical', 'Marketing', 'Tax', 'Others', 'No Action Required', 'Unclassified']

const CAT_COLORS = {
  'IT Technical':       '#3b82f6',
  'Marketing':          '#ec4899',
  'Tax':                '#f59e0b',
  'Others':             '#10b981',
  'No Action Required': '#71717a',
  'Unclassified':       '#ef4444',
}

const METHOD_COLORS = {
  'rules':  '#10b981',
  'ai':     '#3b82f6',
  'manual': '#8b5cf6',
}

const DATE_OPTIONS = [
  { label: 'Last 7 days',  value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time',     value: 'all' },
]

function getDateRange(preset) {
  if (preset === 'all') return {}
  const days = { '7d': 7, '30d': 30, '90d': 90 }[preset]
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo:   new Date().toISOString().split('T')[0],
  }
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-zinc-800 text-white border border-zinc-700 rounded-xl px-4 py-2.5 pr-9 text-sm cursor-pointer focus:outline-none hover:border-zinc-500 focus:border-zinc-500 transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

function FilterChip({ children }) {
  return (
    <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full">
      {children}
    </span>
  )
}

export default function App() {
  const [stats, setStats]                 = useState(null)
  const [emails, setEmails]               = useState({ results: [], count: 0 })
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [category, setCategory]           = useState('')
  const [datePreset, setDatePreset]       = useState('all')
  const [page, setPage]                   = useState(1)
  const [loading, setLoading]             = useState(true)

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset])
  const filtersActive = category !== '' || datePreset !== 'all'

  const loadStats = useCallback(async () => {
    try { setStats(await fetchStats()) }
    catch (e) { console.error(e) }
  }, [])

  const loadEmails = useCallback(async () => {
    setLoading(true)
    try { setEmails(await fetchEmails({ category, ...dateRange, page })) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [category, dateRange, page])

  useEffect(() => { loadStats() },  [loadStats])
  useEffect(() => { loadEmails() }, [loadEmails])

  const handleSelectEmail = async (id) => {
    try { setSelectedEmail(await fetchEmail(id)) }
    catch (e) { console.error(e) }
  }

  const handleReclassify = async (id, cat) => {
    await reclassifyEmail(id, cat)
    setSelectedEmail(null)
    await Promise.all([loadStats(), loadEmails()])
  }

  const clearFilters = () => { setCategory(''); setDatePreset('all'); setPage(1) }

  const catOptions = [
    { label: 'All categories', value: '' },
    ...CATEGORIES.map(c => ({ label: c, value: c })),
  ]

  const categoryItems = (stats?.by_category ?? []).map(d => ({
    label:   d.category,
    value:   d.count,
    display: `${d.count} (${d.percentage}%)`,
    color:   CAT_COLORS[d.category] ?? '#71717a',
  }))

  const methodItems = (stats?.method_breakdown ?? []).map(d => ({
    label:   d.label,
    value:   d.count,
    display: `${d.count} (${d.percentage}%)`,
    color:   METHOD_COLORS[d.method] ?? '#71717a',
  }))

  const activeDateLabel = DATE_OPTIONS.find(o => o.value === datePreset)?.label ?? 'All time'

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="border-b border-zinc-800 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email triage dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Business inbox · live view</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <FilterSelect value={datePreset} onChange={v => { setDatePreset(v); setPage(1) }} options={DATE_OPTIONS} />
            <FilterSelect value={category}   onChange={v => { setCategory(v);   setPage(1) }} options={catOptions} />
            <a
              href={exportUrl({ category, ...dateRange })}
              download
              className="flex items-center gap-1.5 bg-zinc-800 text-white border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-zinc-700 hover:border-zinc-500 transition-colors whitespace-nowrap"
            >
              Export CSV <span className="text-zinc-400 text-xs">↗</span>
            </a>
          </div>
        </div>
      </header>

      <main className="px-8 py-6 max-w-7xl mx-auto space-y-5">
        {stats && (
          <MetricCards
            totalEmails={stats.total_emails}
            rulesRate={stats.rules_rate}
            accuracyRate={stats.accuracy_rate}
            pendingReview={stats.pending_review}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BarList title="Category breakdown" items={categoryItems} />
          <BarList title="Classification method" items={methodItems} />
        </div>

        {/* Active filter state */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-zinc-600">Showing</span>
          <FilterChip>{activeDateLabel}</FilterChip>
          <FilterChip>{category || 'All categories'}</FilterChip>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors ml-1 underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700/60">
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
