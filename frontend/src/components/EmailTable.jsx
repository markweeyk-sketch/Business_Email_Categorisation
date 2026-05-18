const PAGE_SIZE = 20

const BADGE = {
  'IT Technical':       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  'Marketing':          'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  'Tax':                'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  'Others':             'bg-zinc-600/30 text-zinc-300 border border-zinc-600/40',
  'No Action Required': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  'Unclassified':       'bg-red-500/15 text-red-400 border border-red-500/20',
}

function PaginationControls({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className="text-sm px-2.5 py-1 rounded-lg bg-zinc-700 text-zinc-300 disabled:opacity-30 hover:bg-zinc-600 transition-colors"
      >
        ←
      </button>
      <span className="text-sm text-zinc-500 tabular-nums w-16 text-center">{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
        disabled={page >= totalPages}
        className="text-sm px-2.5 py-1 rounded-lg bg-zinc-700 text-zinc-300 disabled:opacity-30 hover:bg-zinc-600 transition-colors"
      >
        →
      </button>
    </div>
  )
}

export default function EmailTable({ emails, total, page, onPageChange, onSelect, loading }) {
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const hasEmails = !loading && emails.length > 0

  return (
    <div>
      {/* Top bar: count + pagination */}
      <div className="px-5 py-3.5 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-sm text-zinc-500">{total.toLocaleString()} emails</span>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-zinc-600">Loading…</div>
      ) : emails.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">No emails found</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-600 uppercase tracking-wider border-b border-zinc-700/60">
              <th className="px-5 py-3 text-left font-medium">Subject</th>
              <th className="px-5 py-3 text-left font-medium">Sender</th>
              <th className="px-5 py-3 text-left font-medium">Category</th>
              <th className="px-5 py-3 text-left font-medium">Confidence</th>
              <th className="px-5 py-3 text-left font-medium">Routed To</th>
              <th className="px-5 py-3 text-left font-medium">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/40">
            {emails.map(email => (
              <tr
                key={email.id}
                onClick={() => onSelect(email.id)}
                className="hover:bg-zinc-700/25 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-zinc-100 max-w-xs">
                  <div className="flex items-center gap-2">
                    {email.requires_review && (
                      <span className="shrink-0 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    )}
                    <span className="truncate">{email.subject}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-zinc-500 max-w-[200px] truncate">{email.sender}</td>
                <td className="px-5 py-3.5">
                  {email.category && (
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${BADGE[email.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {email.category}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-zinc-500 tabular-nums">
                  {email.confidence != null ? `${(email.confidence * 100).toFixed(0)}%` : '—'}
                </td>
                <td className="px-5 py-3.5 text-zinc-500">{email.routed_to ?? '—'}</td>
                <td className="px-5 py-3.5 text-zinc-600 text-xs tabular-nums">
                  {new Date(email.received_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Bottom pagination */}
      {hasEmails && (
        <div className="px-5 py-3.5 border-t border-zinc-700 flex items-center justify-end">
          <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
