// Tipos compartidos por las APIs de conversaciones y mensajes.

/** Misma forma que PagedResultDto del backend. */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface Conversation {
  id: number;
  /** Solo uno de los dos orígenes trae valor: match o solicitud de contacto. */
  matchId: number | null;
  contactRequestId: number | null;
  /** Quien busca su objeto. */
  requesterId: number;
  /** Quien publicó el objeto encontrado. */
  finderId: number;
  requesterConfirmedReturn: boolean;
  finderConfirmedReturn: boolean;
  foundItem: FoundItem;
  /** null cuando el chat nació de una solicitud de contacto. */
  lostItem: LostItem | null;
  createdAt: string;
  /** null mientras la conversación sigue abierta. */
  closedAt: string | null;
}

export interface ConfirmReturnResponse {
  success: boolean;
  message: string;
  id: number | null;
  /** true cuando ambos ya confirmaron y la conversación se cerró. */
  bothConfirmed: boolean | null;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  /** null hasta que el otro participante lo lee. */
  readAt: string | null;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  id: number | null;
}

export interface MarkAsReadResponse {
  success: boolean;
}

// Las fechas llegan como texto ISO 8601 (ej. "2026-09-20T15:33:25.159Z").
export interface ItemBase {
  id: number;
  userId: number;
  category: string;
  article: string;
  color: string;
  location: string;
  description: string;
  /** URL prefirmada de S3, vence en unos minutos. null si no tiene foto. */
  photoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type FoundItem = ItemBase;
export type LostItem = ItemBase;