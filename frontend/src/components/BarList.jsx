export default function BarList({ title, items }) {
  const max = Math.max(...items.map(i => i.value), 1)

  return (
    <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700/60">
      <p className="font-semibold text-white mb-5">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-600 py-8 text-center">No data</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-sm text-zinc-200">{item.label}</span>
                </div>
                <span className="text-sm text-zinc-400 tabular-nums font-medium">{item.display}</span>
              </div>
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
