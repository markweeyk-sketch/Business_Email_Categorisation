import { useState } from 'react'

const BADGE = {
  'IT Technical':       'bg-blue-500/15 text-blue-400',
  'Marketing':          'bg-pink-500/15 text-pink-400',
  'Tax':                'bg-amber-500/15 text-amber-400',
  'Others':             'bg-zinc-600/30 text-zinc-300',
  'No Action Required': 'bg-emerald-500/15 text-emerald-400',
  'Unclassified':       'bg-red-500/15 text-red-400',
}

export default function EmailDetail({ email, categories, onReclassify, onClose }) {
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const cls = email.classification
  const routing = email.routing

  const handleReclassify = async () => {
    if (!newCategory) return
    setSaving(true)
    try { await onReclassify(email.id, newCategory) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-700 z-50 flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <p className="font-semibold text-white">Email Detail</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <p className="font-semibold text-white text-base leading-snug">{email.subject}</p>
            <p className="text-sm text-zinc-400 mt-1">{email.sender}</p>
            <p className="text-xs text-zinc-600 mt-1">{new Date(email.received_at).toLocaleString()}</p>
          </div>

          {cls && (
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3 border border-zinc-700/60">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${BADGE[cls.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {cls.category}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {(cls.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-600">Method:</span>
                <span className="text-zinc-300 capitalize font-medium">{cls.method}</span>
              </div>
              {cls.reason && (
                <p className="text-xs text-zinc-400 leading-relaxed border-t border-zinc-700/60 pt-3">
                  {cls.reason}
                </p>
              )}
              {cls.requires_review && (
                <p className="text-xs text-amber-400 font-medium">⚠ Flagged for review</p>
              )}
            </div>
          )}

          {routing && (
            <div className="flex items-center gap-3 bg-zinc-800 rounded-xl p-4 border border-zinc-700/60">
              <span className="text-sm text-zinc-500">Routed to</span>
              <span className="text-sm font-medium text-zinc-200">{routing.routed_to}</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                routing.status === 'success'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {routing.status}
              </span>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-5 space-y-3">
            <p className="text-sm font-semibold text-white">Reclassify</p>
            <div className="relative">
              <select
                className="w-full appearance-none bg-zinc-800 text-white border border-zinc-700 rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:border-zinc-500 hover:border-zinc-500 transition-colors cursor-pointer"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
              >
                <option value="">Select category…</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              onClick={handleReclassify}
              disabled={!newCategory || saving}
              className="w-full bg-white text-zinc-900 text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-zinc-100 disabled:opacity-25 transition-colors"
            >
              {saving ? 'Saving…' : 'Apply Reclassification'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
