import { useState, useEffect, useCallback } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { loadToken, clearToken, fetchEmail } from './src/api'
import { registerForPush, unregisterPush, onNotificationTap } from './src/notifications'
import LoginScreen from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import EmailDetailModal from './src/screens/EmailDetailModal'
import { colors } from './src/theme'

export default function App() {
  const [ready, setReady]                 = useState(false)
  const [authed, setAuthed]               = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [refreshKey, setRefreshKey]       = useState(0)

  useEffect(() => {
    loadToken().then(token => {
      setAuthed(!!token)
      setReady(true)
    })
  }, [])

  const handleError = useCallback((err) => {
    if (err.unauthorized) {
      setAuthed(false)
      setSelectedEmail(null)
    } else {
      console.warn(err)
    }
  }, [])

  const handleSelectEmail = useCallback(async (id) => {
    try {
      setSelectedEmail(await fetchEmail(id))
    } catch (err) {
      handleError(err)
    }
  }, [handleError])

  // Register this device for push notifications once signed in, and open
  // the email detail sheet when a notification is tapped.
  useEffect(() => {
    if (!authed) return
    registerForPush()
    return onNotificationTap(handleSelectEmail)
  }, [authed, handleSelectEmail])

  const handleLogout = async () => {
    await unregisterPush()
    await clearToken()
    setAuthed(false)
    setSelectedEmail(null)
  }

  const handleReclassified = () => {
    setSelectedEmail(null)
    setRefreshKey(k => k + 1) // triggers dashboard reload
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textMuted} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
      {authed ? (
        <>
          <DashboardScreen
            onSelectEmail={handleSelectEmail}
            onLogout={handleLogout}
            onError={handleError}
            refreshKey={refreshKey}
          />
          <EmailDetailModal
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onReclassified={handleReclassified}
            onError={handleError}
          />
        </>
      ) : (
        <LoginScreen onLogin={() => setAuthed(true)} />
      )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
