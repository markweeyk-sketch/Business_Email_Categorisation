const PAGE_SIZE = 20

const BADGE = {
  'IT Technical': 'bg-blue-100 text-blue-700',
  'Marketing': 'bg-purple-100 text-purple-700',
  'Tax': 'bg-amber-100 text-amber-700',
  'Others': 'bg-gray-100 text-gray-700',
  'No Action Required': 'bg-green-100 text-green-700',
  'Unclassified': 'bg-red-100 text-red-700',
}

export default function EmailTable({ emails, total, page, onPageChange, onSelect, loading }) {
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500">{total.toLocaleString()} emails</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      ) : emails.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No emails found</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Subject</th>
              <th className="px-4 py-2 text-left font-medium">Sender</th>
              <th className="px-4 py-2 text-left font-medium">Category</th>
              <th className="px-4 py-2 text-left font-medium">Confidence</th>
              <th className="px-4 py-2 text-left font-medium">Routed To</th>
              <th className="px-4 py-2 text-left font-medium">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {emails.map(email => (
              <tr
                key={email.id}
                onClick={() => onSelect(email.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    {email.requires_review && (
                      <span className="shrink-0 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    )}
                    <span className="truncate">{email.subject}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{email.sender}</td>
                <td className="px-4 py-3">
                  {email.category && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[email.category] ?? 'bg-gray-100 text-gray-700'}`}>
                      {email.category}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {email.confidence != null ? `${(email.confidence * 100).toFixed(0)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{email.routed_to ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(email.received_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
