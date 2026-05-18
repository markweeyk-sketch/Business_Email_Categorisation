export default function MetricCards({ totalEmails, rulesRate, accuracyRate, pendingReview }) {
  const cards = [
    {
      label: 'Total received',
      value: totalEmails.toLocaleString(),
      sub: null,
      valueColor: 'text-white',
    },
    {
      label: 'Via rules engine',
      value: rulesRate != null ? `${rulesRate}%` : '—',
      sub: 'no AI needed',
      subColor: 'text-zinc-500',
      valueColor: 'text-white',
    },
    {
      label: 'Auto-categorised',
      value: `${accuracyRate}%`,
      sub: 'target: >80%',
      subColor: accuracyRate >= 80 ? 'text-emerald-400' : 'text-red-400',
      valueColor: 'text-white',
    },
    {
      label: 'Pending review',
      value: pendingReview,
      sub: 'unclassified',
      subColor: 'text-zinc-500',
      valueColor: pendingReview > 0 ? 'text-amber-400' : 'text-white',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700/60">
          <p className="text-sm text-zinc-400">{card.label}</p>
          <p className={`text-3xl font-bold mt-2 tracking-tight ${card.valueColor}`}>{card.value}</p>
          {card.sub && (
            <p className={`text-xs mt-1.5 ${card.subColor ?? 'text-zinc-500'}`}>{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  )
}
