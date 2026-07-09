import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native'
import { fetchStats, fetchEmails } from '../api'
import { colors, CATEGORIES, CAT_COLORS, METHOD_COLORS } from '../theme'

function MetricCard({ label, value }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function BarList({ title, items }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map(item => (
        <View key={item.label} style={styles.barRow}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.barDisplay}>{item.display}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {
              width: `${(item.value / max) * 100}%`,
              backgroundColor: item.color,
            }]} />
          </View>
        </View>
      ))}
      {items.length === 0 && <Text style={styles.emptyText}>No data yet</Text>}
    </View>
  )
}

function FilterChip({ label, active, onPress, color }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      {color && <View style={[styles.chipDot, { backgroundColor: color }]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function EmailRow({ email, onPress }) {
  const catColor = CAT_COLORS[email.category] ?? colors.textMuted
  return (
    <TouchableOpacity style={styles.emailRow} onPress={onPress}>
      <View style={styles.emailRowTop}>
        <Text style={styles.emailSender} numberOfLines={1}>{email.sender}</Text>
        <Text style={styles.emailDate}>
          {email.received_at ? new Date(email.received_at).toLocaleDateString() : ''}
        </Text>
      </View>
      <Text style={styles.emailSubject} numberOfLines={2}>{email.subject || '(no subject)'}</Text>
      <View style={styles.emailRowBottom}>
        <View style={[styles.catBadge, { borderColor: catColor }]}>
          <View style={[styles.chipDot, { backgroundColor: catColor }]} />
          <Text style={[styles.catBadgeText, { color: catColor }]}>
            {email.category ?? 'Pending'}
          </Text>
        </View>
        {email.confidence != null && (
          <Text style={styles.confidence}>{Math.round(email.confidence * 100)}%</Text>
        )}
        {email.requires_review && (
          <Text style={styles.reviewFlag}>Needs review</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function DashboardScreen({ onSelectEmail, onLogout, onError, refreshKey }) {
  const [stats, setStats]                 = useState(null)
  const [emails, setEmails]               = useState([])
  const [count, setCount]                 = useState(0)
  const [page, setPage]                   = useState(1)
  const [category, setCategory]           = useState('')
  const [reviewOnly, setReviewOnly]       = useState(false)
  const [loading, setLoading]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [refreshing, setRefreshing]       = useState(false)

  const filters = useCallback((p) => ({
    category: category || undefined,
    requiresReview: reviewOnly ? true : undefined,
    page: p,
  }), [category, reviewOnly])

  const loadAll = useCallback(async (viaRefresh = false) => {
    viaRefresh ? setRefreshing(true) : setLoading(true)
    try {
      const [s, e] = await Promise.all([fetchStats(), fetchEmails(filters(1))])
      setStats(s)
      setEmails(e.results)
      setCount(e.count)
      setPage(1)
    } catch (err) {
      onError(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, onError])

  useEffect(() => { loadAll() }, [loadAll, refreshKey])

  const loadMore = async () => {
    if (loadingMore || loading || emails.length >= count) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const e = await fetchEmails(filters(next))
      setEmails(prev => [...prev, ...e.results])
      setPage(next)
    } catch (err) {
      onError(err)
    } finally {
      setLoadingMore(false)
    }
  }

  const categoryItems = (stats?.by_category ?? []).map(d => ({
    label:   d.category,
    value:   d.count,
    display: `${d.count} (${d.percentage}%)`,
    color:   CAT_COLORS[d.category] ?? colors.textMuted,
  }))

  const methodItems = (stats?.method_breakdown ?? []).map(d => ({
    label:   d.label,
    value:   d.count,
    display: `${d.count} (${d.percentage}%)`,
    color:   METHOD_COLORS[d.method] ?? colors.textMuted,
  }))

  const header = (
    <View>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Email triage</Text>
          <Text style={styles.subtitle}>Business inbox · live view</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.metricGrid}>
          <MetricCard label="Total emails"   value={stats.total_emails} />
          <MetricCard label="Rules rate"     value={`${stats.rules_rate}%`} />
          <MetricCard label="Accuracy"       value={`${stats.accuracy_rate}%`} />
          <MetricCard label="Pending review" value={stats.pending_review} />
        </View>
      )}

      <BarList title="Category breakdown" items={categoryItems} />
      <BarList title="Classification method" items={methodItems} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        <FilterChip
          label="Needs review"
          active={reviewOnly}
          onPress={() => setReviewOnly(v => !v)}
          color={colors.danger}
        />
        <FilterChip
          label="All"
          active={category === ''}
          onPress={() => setCategory('')}
        />
        {CATEGORIES.map(c => (
          <FilterChip
            key={c}
            label={c}
            active={category === c}
            onPress={() => setCategory(prev => prev === c ? '' : c)}
            color={CAT_COLORS[c]}
          />
        ))}
      </ScrollView>

      <Text style={styles.listCount}>
        {count} email{count === 1 ? '' : 's'}
      </Text>
    </View>
  )

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={emails}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => (
        <EmailRow email={item} onPress={() => onSelectEmail(item.id)} />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading
          ? <ActivityIndicator color={colors.textMuted} style={{ marginTop: 32 }} />
          : <Text style={styles.emptyText}>No emails match these filters</Text>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color={colors.textMuted} style={{ marginVertical: 16 }} /> : null
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAll(true)}
          tintColor={colors.textMuted}
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  logout: {
    color: colors.textMuted,
    fontSize: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSub,
    padding: 14,
    flexBasis: '47%',
    flexGrow: 1,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSub,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  barRow: {
    marginBottom: 8,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    color: colors.textDim,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  barDisplay: {
    color: colors.textMuted,
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  filterRow: {
    marginTop: 4,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    color: colors.textDim,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.bg,
    fontWeight: '600',
  },
  listCount: {
    color: colors.textFaint,
    fontSize: 12,
    marginBottom: 8,
  },
  emailRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSub,
    padding: 14,
    marginBottom: 10,
  },
  emailRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  emailSender: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  emailDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  emailSubject: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  emailRowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confidence: {
    color: colors.textMuted,
    fontSize: 12,
  },
  reviewFlag: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
  },
})
