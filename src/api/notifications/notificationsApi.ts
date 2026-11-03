import type {
  AppNotification,
  NotificationReferenceType,
  PagedResult,
} from '../types';

export type { AppNotification, NotificationReferenceType } from '../types';
export type { Notification } from '../types';

export interface RegisterDeviceRequest {
  pushToken: string;
  platform: 'ios' | 'android' | 'web';
}

const demoNotifications: AppNotification[] = [
  {
    id: 1,
    type: 'MatchCreated',
    title: 'Nueva posible coincidencia',
    message: 'Hay una posible coincidencia para revisar.',
    referenceType: 'Match',
    referenceId: 1,
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

export const notificationsApi = {
  getAll: async (
    _token: string,
    pageNumber = 1,
    pageSize = 20
  ): Promise<PagedResult<AppNotification>> => {
    const start = (pageNumber - 1) * pageSize;
    const items = demoNotifications.slice(start, start + pageSize);
    return {
      items,
      pageNumber,
      pageSize,
      totalCount: demoNotifications.length,
      totalPages: Math.ceil(demoNotifications.length / pageSize),
    };
  },

  markAsRead: async (_id: number, _token: string): Promise<{ success: boolean }> => {
    const notification = demoNotifications.find((item) => item.id === _id);
    if (notification) notification.isRead = true;
    return { success: true };
  },

  markAllAsRead: async (_token: string): Promise<{ success: boolean }> => {
    demoNotifications.forEach((item) => {
      item.isRead = true;
    });
    return { success: true };
  },

  registerDevice: async (
    _payload: RegisterDeviceRequest,
    _token: string
  ): Promise<{ success: boolean }> => ({ success: true }),
};
