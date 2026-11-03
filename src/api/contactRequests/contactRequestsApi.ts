import { request } from '../auth/client';
import type {
  ActionResponse,
  ContactRequest,
  ContactRequestPayload,
} from '../types';

export type { ContactRequest, ContactRequestPayload } from '../types';

export const contactRequestsApi = {
  getAll: (token: string) =>
    request<ContactRequest[]>('/api/contactrequests', { token }),

  getById: (id: number, token: string) =>
    request<ContactRequest>(`/api/contactrequests/${encodeURIComponent(id)}`, { token }),

  create: (payload: ContactRequestPayload, token: string) =>
    request<ActionResponse>('/api/contactrequests', {
      method: 'POST',
      body: payload,
      token,
    }),

  accept: (id: number, token: string) =>
    runAction(id, 'accept', token),

  reject: (id: number, token: string) =>
    runAction(id, 'reject', token),

  cancel: (id: number, token: string) =>
    runAction(id, 'cancel', token),
};

function runAction(
  id: number,
  action: 'accept' | 'reject' | 'cancel',
  token: string
): Promise<ActionResponse> {
  return request<ActionResponse>(
    `/api/contactrequests/${encodeURIComponent(id)}/${action}`,
    {
      method: 'POST',
      token,
    }
  );
}
