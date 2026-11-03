import { request } from '../auth/client';
import type { ConfirmReturnResponse, Conversation } from '../types';

export type { ConfirmReturnResponse, Conversation } from '../types';

export const conversationsApi = {
  getAll: (token: string) =>
    request<Conversation[]>('/api/conversations', { token }),

  getById: (id: number, token: string) =>
    request<Conversation>(`/api/conversations/${encodeURIComponent(id)}`, { token }),

  confirmReturn: (id: number, token: string) =>
    request<ConfirmReturnResponse>(
      `/api/conversations/${encodeURIComponent(id)}/confirm-return`,
      {
        method: 'POST',
        token,
      }
    ),
};