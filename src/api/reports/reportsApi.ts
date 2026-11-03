import { request } from '../auth/client';
import { API_BASE_URL } from '../../config/api';

export type ReportId = number | string;

export interface Report {
  id: ReportId;
  userId: ReportId;
  name: string;
  category: string;
  description: string;
  status: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFields {
  name: string;
  category: string;
  description: string;
  photo?: ReportPhoto;
}

export interface ReportPhoto {
  uri: string;
  name: string;
  type: string;
}

export interface UpdateReportFields extends Partial<ReportFields> {
  status?: string;
}

export interface ReportPage {
  items: Report[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ReportResponse {
  success: boolean;
  message: string;
  id?: ReportId | null;
}

export const reportsApi = {
  list: async (
    token: string,
    pageNumber = 1,
    pageSize = 20
  ): Promise<ReportPage> => {
    const response = await request<unknown>(
      `/api/Reports?PageNumber=${pageNumber}&PageSize=${pageSize}`,
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
      throw new Error('La respuesta de reportes del servidor no tiene un formato válido.');
    }

    return {
      items: response.items.map(parseReport),
      pageNumber: response.pageNumber,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
      totalPages: response.totalPages,
    };
  },

  create: async (fields: ReportFields, token: string) => {
    const response = await request<ReportResponse>('/api/Reports', {
      method: 'POST',
      body: toFormData(fields),
      token,
    });
    assertSuccess(response);
  },

  update: async (id: ReportId, fields: UpdateReportFields, token: string) => {
    const response = await request<ReportResponse>(
      `/api/Reports/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: toFormData(fields),
        token,
      }
    );
    assertSuccess(response);
  },

  delete: async (id: ReportId, token: string) => {
    const response = await request<ReportResponse>(
      `/api/Reports/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        token,
      }
    );
    assertSuccess(response);
  },
};

function toFormData(fields: UpdateReportFields): FormData {
  const formData = new FormData();

  if (fields.name !== undefined) formData.append('Name', fields.name);
  if (fields.category !== undefined) formData.append('Category', fields.category);
  if (fields.description !== undefined) formData.append('Description', fields.description);
  if (fields.status !== undefined) formData.append('Status', fields.status);
  if (fields.photo) {
    formData.append(
      'Photo',
      {
        uri: fields.photo.uri,
        name: fields.photo.name,
        type: fields.photo.type,
      } as unknown as Blob
    );
  }

  return formData;
}

function parseReport(value: unknown): Report {
  if (!isRecord(value)) {
    throw new Error('El servidor devolvió un reporte con formato inválido.');
  }

  const { id, userId, name, category, description, status, photoUrl, createdAt, updatedAt } =
    value;

  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    (typeof userId !== 'number' && typeof userId !== 'string') ||
    typeof name !== 'string' ||
    typeof category !== 'string' ||
    typeof description !== 'string' ||
    typeof status !== 'string' ||
    (photoUrl !== null && photoUrl !== undefined && typeof photoUrl !== 'string') ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    throw new Error('El servidor devolvió un reporte con campos inválidos.');
  }

  return {
    id,
    userId,
    name,
    category,
    description,
    status,
    photoUrl: resolvePhotoUrl(photoUrl ?? null),
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

function assertSuccess(response: ReportResponse | null): void {
  if (response === null) {
    return;
  }

  if (response?.success !== true) {
    throw new Error(response?.message || 'El servidor no pudo guardar el reporte.');
  }
}
