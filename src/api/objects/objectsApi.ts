import { request } from '../auth/client';
import { appendPhoto } from '../photoUpload';
import { API_BASE_URL, PHOTO_UPLOAD_TIMEOUT_MS } from '../../config/api';

export type ObjectItemId = number | string;
export type ObjectItemKind = 'lost' | 'found';

export interface ObjectItem {
  id: ObjectItemId;
  userId: ObjectItemId;
  category: string;
  article: string;
  color: string;
  location: string;
  description: string;
  photoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectItemPhoto {
  uri: string;
  name: string;
  type: string;
}

export interface ObjectItemFields {
  category: string;
  article: string;
  color: string;
  location: string;
  description: string;
  status: string;
  photo?: ObjectItemPhoto;
}

export interface ObjectItemPage {
  items: ObjectItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ObjectItemResponse {
  success: boolean;
  message: string;
}

const resourcePath: Record<ObjectItemKind, string> = {
  lost: '/api/LostItems',
  found: '/api/FoundItems',
};

export const objectsApi = {
  list: async (
    kind: ObjectItemKind,
    token: string,
    pageNumber = 1,
    pageSize = 20
  ): Promise<ObjectItemPage> => {
    const response = await request<unknown>(
      `${resourcePath[kind]}?PageNumber=${pageNumber}&PageSize=${pageSize}`,
      { token }
    );

    if (
      !isRecord(response) ||
      !Array.isArray(response.items) ||
      !isPositiveInteger(response.pageNumber) ||
      !isPositiveInteger(response.pageSize) ||
      !isNonNegativeInteger(response.totalCount) ||
      !isNonNegativeInteger(response.totalPages)
    ) {
      throw new Error('La respuesta de objetos del servidor no tiene un formato válido.');
    }

    return {
      items: response.items.map(parseObjectItem),
      pageNumber: response.pageNumber,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
      totalPages: response.totalPages,
    };
  },

  create: async (kind: ObjectItemKind, fields: ObjectItemFields, token: string) => {
    const response = await request<ObjectItemResponse | null>(resourcePath[kind], {
      method: 'POST',
      body: await toFormData(fields),
      token,
      ...(fields.photo ? { timeoutMs: PHOTO_UPLOAD_TIMEOUT_MS } : {}),
    });
    assertSuccess(response);
  },

  update: async (
    kind: ObjectItemKind,
    id: ObjectItemId,
    fields: ObjectItemFields,
    token: string
  ) => {
    const response = await request<ObjectItemResponse | null>(
      `${resourcePath[kind]}/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: await toFormData(fields),
        token,
        ...(fields.photo ? { timeoutMs: PHOTO_UPLOAD_TIMEOUT_MS } : {}),
      }
    );
    assertSuccess(response);
  },

  delete: async (kind: ObjectItemKind, id: ObjectItemId, token: string) => {
    const response = await request<ObjectItemResponse | null>(
      `${resourcePath[kind]}/${encodeURIComponent(id)}`,
      { method: 'DELETE', token }
    );
    assertSuccess(response);
  },
};

async function toFormData(fields: ObjectItemFields): Promise<FormData> {
  const formData = new FormData();
  formData.append('Category', fields.category);
  formData.append('Article', fields.article);
  formData.append('Color', fields.color);
  formData.append('Location', fields.location);
  formData.append('Description', fields.description);
  formData.append('Status', fields.status);

  if (fields.photo) {
    await appendPhoto(formData, fields.photo);
  }

  return formData;
}

function parseObjectItem(value: unknown): ObjectItem {
  if (!isRecord(value)) {
    throw new Error('El servidor devolvió un objeto con formato inválido.');
  }

  const { id, userId, category, article, color, location, description, status, createdAt, updatedAt } =
    value;
  const photoUrl = value.photoUrl ?? value.photoPath ?? null;

  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    (typeof userId !== 'number' && typeof userId !== 'string') ||
    typeof category !== 'string' ||
    typeof article !== 'string' ||
    typeof color !== 'string' ||
    typeof location !== 'string' ||
    typeof description !== 'string' ||
    typeof status !== 'string' ||
    (photoUrl !== null && typeof photoUrl !== 'string') ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    throw new Error('El servidor devolvió un objeto con campos inválidos.');
  }

  return {
    id,
    userId,
    category,
    article,
    color,
    location,
    description,
    photoUrl: resolvePhotoUrl(photoUrl),
    status,
    createdAt,
    updatedAt,
  };
}

function resolvePhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl || /^[a-z][a-z\d+.-]*:/i.test(photoUrl)) {
    return photoUrl;
  }

  return `${API_BASE_URL}/${photoUrl.replace(/^\/+/, '')}`;
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

function assertSuccess(response: ObjectItemResponse | null): void {
  if (response === null) {
    return;
  }

  if (response.success !== true) {
    throw new Error(response.message || 'El servidor no pudo guardar el objeto.');
  }
}
