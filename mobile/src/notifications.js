import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerDevice, unregisterDevice } from './api'

// Show notifications as banners even while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// The token registered with the backend this session, so logout can revoke it.
let registeredToken = null

export async function registerForPush() {
  try {
    // Push tokens only exist on physical devices, and getExpoPushTokenAsync
    // needs an EAS projectId (added to app.json by `eas init`). Without
    // either, quietly skip — the app works fine without push.
    if (!Device.isDevice) return null
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId
    if (!projectId) return null

    // Android 13+ shows the permission prompt only after a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }

    const { status: existing } = await Notifications.getPermissionsAsync()
    let status = existing
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync()
      status = res.status
    }
    if (status !== 'granted') return null

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await registerDevice(token)
    registeredToken = token
    return token
  } catch (err) {
    console.warn('Push registration failed:', err)
    return null
  }
}

export async function unregisterPush() {
  if (!registeredToken) return
  try {
    await unregisterDevice(registeredToken)
  } catch (err) {
    console.warn('Push unregister failed:', err)
  } finally {
    registeredToken = null
  }
}

// Subscribe to notification taps; returns an unsubscribe function.
export function onNotificationTap(callback) {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response?.notification?.request?.content?.data
    if (data?.email_id) callback(data.email_id)
  })
  return () => sub.remove()
}
