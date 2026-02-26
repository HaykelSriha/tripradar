import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerDevice } from "./api";

// Configure how notifications are handled while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests push-notification permission and returns the Expo push token
 * (which wraps the FCM token on Android).
 * Returns null if permission denied or unavailable.
 */
export async function requestPushPermission(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  // Expo's push token wraps the device FCM/APNs token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/**
 * Registers the device FCM token with the backend.
 * Call after login + permission granted.
 */
export async function registerPushToken(
  accessToken: string
): Promise<void> {
  const token = await requestPushPermission();
  if (!token) return;
  await registerDevice(token, accessToken);
}

/**
 * Returns a subscription object that navigates to a deal
 * when the user taps a notification.
 * Pass a router.push function from expo-router.
 */
export function subscribeToDealTaps(
  onTap: (dealId: string) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      deal_id?: string;
    };
    if (data?.deal_id) onTap(data.deal_id);
  });
}
