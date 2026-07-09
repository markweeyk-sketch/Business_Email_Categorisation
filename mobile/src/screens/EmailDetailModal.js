import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { reclassifyEmail } from '../api'
import { colors, CATEGORIES, CAT_COLORS } from '../theme'

function Field({ label, value }) {
  if (value == null || value === '') return null
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  )
}

export default function EmailDetailModal({ email, onClose, onReclassified, onError }) {
  const [saving, setSaving] = useState(null) // category being saved, or null

  const cls = email?.classification
  const routing = email?.routing

  const reclassify = async (category) => {
    if (saving) return
    setSaving(category)
    try {
      await reclassifyEmail(email.id, category)
      onReclassified()
    } catch (err) {
      onError(err)
      setSaving(null)
    }
  }

  return (
    <Modal visible={!!email} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Email detail</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody}>
            <Field label="From"     value={email?.sender} />
            <Field label="Subject"  value={email?.subject} />
            <Field label="Received" value={email?.received_at && new Date(email.received_at).toLocaleString()} />

            {cls && (
              <View style={styles.clsCard}>
                <View style={styles.clsRow}>
                  <View style={[styles.chipDot, { backgroundColor: CAT_COLORS[cls.category] ?? colors.textMuted }]} />
                  <Text style={styles.clsCategory}>{cls.category}</Text>
                  <Text style={styles.clsMeta}>
                    {Math.round(cls.confidence * 100)}% · {cls.method}
                  </Text>
                </View>
                {cls.reason ? <Text style={styles.clsReason}>{cls.reason}</Text> : null}
                {cls.requires_review && <Text style={styles.reviewFlag}>Needs review</Text>}
              </View>
            )}

            {routing && (
              <Field label="Routed to" value={`${routing.routed_to} (${routing.status})`} />
            )}

            <Text style={styles.reclassifyTitle}>Reclassify as</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => {
                const current = cls?.category === c
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catButton, current && styles.catButtonCurrent]}
                    onPress={() => reclassify(c)}
                    disabled={current || !!saving}
                  >
                    {saving === c
                      ? <ActivityIndicator size="small" color={colors.text} />
                      : (
                        <>
                          <View style={[styles.chipDot, { backgroundColor: CAT_COLORS[c] }]} />
                          <Text style={[styles.catButtonText, current && styles.catButtonTextCurrent]}>
                            {c}{current ? ' ✓' : ''}
                          </Text>
                        </>
                      )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSub,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  close: {
    color: colors.textMuted,
    fontSize: 14,
  },
  sheetBody: {
    padding: 16,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  fieldValue: {
    color: colors.text,
    fontSize: 14,
  },
  clsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSub,
    padding: 14,
    marginBottom: 12,
  },
  clsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clsCategory: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  clsMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  clsReason: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 8,
  },
  reviewFlag: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  reclassifyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 10,
  },
  catGrid: {
    gap: 8,
  },
  catButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  catButtonCurrent: {
    opacity: 0.45,
  },
  catButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  catButtonTextCurrent: {
    color: colors.textMuted,
  },
})
