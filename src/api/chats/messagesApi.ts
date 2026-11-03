import { request } from '../auth/client';
import type {
  ChatMessage,
  MarkAsReadResponse,
  PagedResult,
  PaginationParams,
  SendMessageRequest,
  SendMessageResponse,
} from '../types';

export type {
  ChatMessage,
  MarkAsReadResponse,
  SendMessageRequest,
  SendMessageResponse,
} from '../types';

export const messagesApi = {
  // Más recientes primero: la página 1 trae los últimos mensajes.
  // El backend marca como leídos los del otro participante al pedirla.
  getByConversation: (
    conversationId: number,
    token: string,
    { pageNumber = 1, pageSize = 20 }: PaginationParams = {}
  ) =>
    request<PagedResult<ChatMessage>>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      { token }
    ),

  send: (conversationId: number, payload: SendMessageRequest, token: string) =>
    request<SendMessageResponse>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        body: payload,
        token,
      }
    ),

  markAsRead: (conversationId: number, token: string) =>
    request<MarkAsReadResponse>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages/mark-read`,
      {
        method: 'POST',
        token,
      }
    ),
};