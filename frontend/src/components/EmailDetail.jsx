import { useState } from 'react'

const BADGE = {
  'IT Technical': 'bg-blue-100 text-blue-700',
  'Marketing': 'bg-purple-100 text-purple-700',
  'Tax': 'bg-amber-100 text-amber-700',
  'Others': 'bg-gray-100 text-gray-700',
  'No Action Required': 'bg-green-100 text-green-700',
  'Unclassified': 'bg-red-100 text-red-700',
}

export default function EmailDetail({ email, categories, onReclassify, onClose }) {
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const cls = email.classification
  const routing = email.routing

  const handleReclassify = async () => {
    if (!newCategory) return
    setSaving(true)
    try {
      await onReclassify(email.id, newCategory)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <p className="font-semibold text-sm text-gray-900">Email Detail</p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div>
            <p className="font-medium text-gray-900 leading-snug">{email.subject}</p>
            <p className="text-sm text-gray-500 mt-1">{email.sender}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(email.received_at).toLocaleString()}
            </p>
          </div>

          {cls && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[cls.category] ?? 'bg-gray-100 text-gray-700'}`}>
                  {cls.category}
                </span>
                <span className="text-xs text-gray-500">
                  {(cls.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Method: <span className="font-medium capitalize">{cls.method}</span>
              </p>
              {cls.reason && (
                <p className="text-xs text-gray-600 leading-relaxed">{cls.reason}</p>
              )}
              {cls.requires_review && (
                <p className="text-xs text-amber-600 font-medium">Flagged for review</p>
              )}
            </div>
          )}

          {routing && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Routed to</span>
              <span className="font-medium text-gray-700">{routing.routed_to}</span>
              <span className={`text-xs ${routing.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {routing.status}
              </span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-5 space-y-3">
            <p className="text-sm font-medium text-gray-700">Reclassify</p>
            <select
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
            >
              <option value="">Select category…</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleReclassify}
              disabled={!newCategory || saving}
              className="w-full bg-gray-900 text-white text-sm rounded px-3 py-2 hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Saving…' : 'Apply Reclassification'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
