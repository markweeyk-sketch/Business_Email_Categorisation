export default function MetricCards({ totalEmails, avgResponseTime, accuracyRate, pendingReview }) {
  const cards = [
    {
      label: 'Total Emails',
      value: totalEmails.toLocaleString(),
      color: 'text-gray-900',
    },
    {
      label: 'Avg Response Time',
      value: avgResponseTime ? `${avgResponseTime}m` : '—',
      color: 'text-blue-600',
    },
    {
      label: 'Accuracy Rate',
      value: `${accuracyRate}%`,
      color: 'text-green-600',
    },
    {
      label: 'Pending Review',
      value: pendingReview,
      color: pendingReview > 0 ? 'text-amber-600' : 'text-gray-900',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
