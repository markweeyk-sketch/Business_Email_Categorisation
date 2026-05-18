import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = {
  'IT Technical': '#3b82f6',
  'Marketing': '#8b5cf6',
  'Tax': '#f59e0b',
  'Others': '#6b7280',
  'No Action Required': '#10b981',
  'Unclassified': '#ef4444',
}

const SHORT = {
  'IT Technical': 'IT Tech',
  'No Action Required': 'No Action',
}

export default function CategoryChart({ data }) {
  const chart = data.map(d => ({ ...d, label: SHORT[d.category] ?? d.category }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chart} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={label => chart.find(d => d.label === label)?.category ?? label}
          formatter={v => [v, 'Emails']}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chart.map(d => (
            <Cell key={d.category} fill={COLORS[d.category] ?? '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
