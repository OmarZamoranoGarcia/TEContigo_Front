import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationsApi } from '../../api/notifications/notificationsApi';
import type { NotificationReferenceType } from '../../api/types';
import type { PushNotificationTarget } from './ChatsScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushDevice(token: string): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos TEC',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  await notificationsApi.registerDevice(
    {
      pushToken: String(deviceToken.data),
      platform: Platform.OS,
    },
    token
  );
}

export function getPushTarget(
  response: Notifications.NotificationResponse
): PushNotificationTarget | null {
  const data: unknown = response.notification.request.content.data;
  if (!isRecord(data)) return null;

  const referenceType = data.referenceType;
  const referenceId = typeof data.referenceId === 'number'
    ? data.referenceId
    : typeof data.referenceId === 'string'
      ? Number(data.referenceId)
      : NaN;
  if (
    !isReferenceType(referenceType) ||
    !Number.isInteger(referenceId)
  ) {
    return null;
  }

  return {
    key: `${referenceType}:${referenceId}:${response.notification.request.identifier}`,
    referenceType,
    referenceId,
  };
}

function isReferenceType(value: unknown): value is NotificationReferenceType {
  return value === 'Match' || value === 'Conversation' || value === 'ContactRequest';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
