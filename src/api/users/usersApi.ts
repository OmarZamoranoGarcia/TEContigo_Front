import { request } from '../auth/client';

export type UserId = number | string;
export type ManagedUserRole = 'USER' | 'EDITOR' | 'MODERATOR' | 'ADMIN';

export interface ManagedUser {
  id: UserId;
  controlNumber: number | string;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  email: string;
  role: ManagedUserRole;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface ManagedUserFields {
  controlNumber: number;
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
  email: string;
  role: ManagedUserRole;
  emailVerified: boolean;
}

export interface CreateManagedUserFields extends ManagedUserFields {
  password: string;
}

export interface ManagedUserPage {
  items: ManagedUser[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const USERS_PATH = '/api/Users';

export const usersApi = {
  list: async (
    token: string,
    pageNumber = 1,
    pageSize = 20
  ): Promise<ManagedUserPage> => {
    const response = await request<unknown>(
      `${USERS_PATH}?PageNumber=${pageNumber}&PageSize=${pageSize}`,
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
      throw new Error('La respuesta de usuarios del servidor no tiene un formato válido.');
    }

    return {
      items: response.items.map(parseUser),
      pageNumber: response.pageNumber,
      pageSize: response.pageSize,
      totalCount: response.totalCount,
      totalPages: response.totalPages,
    };
  },

  create: async (fields: CreateManagedUserFields, token: string): Promise<void> => {
    const response = await request<unknown>(USERS_PATH, {
      method: 'POST',
      body: fields,
      token,
    });
    assertSuccess(response);
  },

  listAll: async (token: string): Promise<ManagedUser[]> => {
    const firstPage = await usersApi.list(token, 1, 100);
    const users = [...firstPage.items];

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
      const result = await usersApi.list(token, page, firstPage.pageSize);
      users.push(...result.items);
    }

    return users;
  },

  update: async (
    id: UserId,
    fields: ManagedUserFields,
    token: string
  ): Promise<void> => {
    const response = await request<unknown>(
      `${USERS_PATH}/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: fields,
        token,
      }
    );
    assertSuccess(response);
  },

  delete: async (id: UserId, token: string): Promise<void> => {
    const response = await request<unknown>(
      `${USERS_PATH}/${encodeURIComponent(id)}`,
      { method: 'DELETE', token }
    );
    assertSuccess(response);
  },
};

function parseUser(value: unknown): ManagedUser {
  if (!isRecord(value)) {
    throw new Error('El servidor devolvió un usuario con formato inválido.');
  }

  const {
    id,
    controlNumber,
    firstName,
    lastNamePaternal,
    lastNameMaternal,
    email,
    role,
    emailVerified,
    createdAt,
  } = value;
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';

  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    (typeof controlNumber !== 'number' && typeof controlNumber !== 'string') ||
    typeof firstName !== 'string' ||
    typeof lastNamePaternal !== 'string' ||
    typeof lastNameMaternal !== 'string' ||
    typeof email !== 'string' ||
    !isManagedUserRole(normalizedRole) ||
    (emailVerified !== undefined && typeof emailVerified !== 'boolean') ||
    (createdAt !== undefined && typeof createdAt !== 'string')
  ) {
    throw new Error('El servidor devolvió un usuario con campos inválidos.');
  }

  return {
    id,
    controlNumber,
    firstName,
    lastNamePaternal,
    lastNameMaternal,
    email,
    role: normalizedRole,
    ...(typeof emailVerified === 'boolean' ? { emailVerified } : {}),
    ...(typeof createdAt === 'string' ? { createdAt } : {}),
  };
}

function assertSuccess(response: unknown): void {
  if (isRecord(response) && response.success === false) {
    throw new Error(
      typeof response.message === 'string' && response.message
        ? response.message
        : 'El servidor no pudo completar la operación.'
    );
  }
}

function isManagedUserRole(value: string): value is ManagedUserRole {
  return (
    value === 'USER' ||
    value === 'EDITOR' ||
    value === 'MODERATOR' ||
    value === 'ADMIN'
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
