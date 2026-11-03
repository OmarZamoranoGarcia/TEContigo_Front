import { request } from '../auth/client';
import type {
  Match,
  PagedResult,
  RequestChatResponse,
} from '../types';

export type { Match, RequestChatResponse } from '../types';

export const matchesApi = {
  getAll: async (token: string, pageNumber = 1, pageSize = 20) => {
    const result = await request<unknown>(
      `/api/matches?pageNumber=${pageNumber}&pageSize=${pageSize}`,
      { token }
    );
    return parsePagedMatches(result);
  },

  getById: (id: number, token: string) =>
    request<Match>(`/api/matches/${encodeURIComponent(id)}`, { token }),

  requestChat: (id: number, token: string) =>
    request<RequestChatResponse>(
      `/api/matches/${encodeURIComponent(id)}/request-chat`,
      {
        method: 'POST',
        token,
      }
    ),
};

function parsePagedMatches(value: unknown): PagedResult<Match> {
  if (Array.isArray(value)) {
    throw new Error(
      'GET /api/matches devolvió un arreglo; el contrato requiere un objeto paginado con items y metadatos.'
    );
  }

  if (!isRecord(value)) {
    throw new Error(
      'GET /api/matches devolvió una respuesta vacía o no válida; se esperaba un objeto paginado con items.'
    );
  }

  if (isMatch(value)) {
    throw new Error(
      'GET /api/matches devolvió un solo Match, pero la lista requiere { items, pageNumber, pageSize, totalCount, totalPages }. Ajusta el endpoint del backend para devolver el DTO paginado.'
    );
  }

  if (!Array.isArray(value.items)) {
    throw new Error(
      'GET /api/matches devolvió un objeto sin items; se esperaba { items, pageNumber, pageSize, totalCount, totalPages }.'
    );
  }

  const pageNumber = value.pageNumber;
  const pageSize = value.pageSize;
  const totalCount = value.totalCount;
  const totalPages = value.totalPages;
  if (
    !isPositiveInteger(pageNumber) ||
    !isPositiveInteger(pageSize) ||
    !isNonNegativeInteger(totalCount) ||
    !isNonNegativeInteger(totalPages)
  ) {
    throw new Error(
      'GET /api/matches devolvió items, pero los metadatos de paginación son inválidos.'
    );
  }

  const items: Match[] = [];
  value.items.forEach((match, index) => {
    if (!isMatch(match)) {
      throw new Error(
        `GET /api/matches devolvió un match inválido en items[${index}].`
      );
    }
    items.push(match);
  });

  return { items, pageNumber, pageSize, totalCount, totalPages };
}

function isMatch(value: unknown): value is Match {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'number' &&
    typeof value.matchPercentage === 'number' &&
    typeof value.status === 'string' &&
    typeof value.lostUserChatRequest === 'boolean' &&
    typeof value.foundUserChatRequest === 'boolean' &&
    isItem(value.lostItem) &&
    isItem(value.foundItem) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isItem(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'number' &&
    typeof value.userId === 'number' &&
    typeof value.category === 'string' &&
    typeof value.article === 'string' &&
    typeof value.color === 'string' &&
    typeof value.location === 'string' &&
    typeof value.description === 'string' &&
    (value.photoUrl === null || typeof value.photoUrl === 'string') &&
    typeof value.status === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
