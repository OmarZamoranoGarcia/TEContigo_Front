import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { LoginResponse } from './api/auth/authApi';
import { authApi } from './api/auth/authApi';
import { ApiError } from './api/auth/client';

export type Role = 'USER' | 'EDITOR' | 'MODERATOR' | 'ADMIN';

export interface User {
  id?: string;
  email: string;
  role?: Role;
}

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (session: LoginResponse, email: string) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthSession extends LoginResponse {
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);

  const login = (tokens: LoginResponse, email: string) => {
    setSession(createSession(tokens, email));
  };

  const refreshSession = async () => {
    if (!session) {
      throw new Error('No hay una sesión activa para renovar.');
    }

    try {
      const tokens = await authApi.refresh({ refreshToken: session.refreshToken });
      setSession(createSession(tokens, session.user.email));
    } catch (error) {
      setSession(null);
      throw error;
    }
  };

  const logout = async () => {
    if (!session) {
      return;
    }

    try {
      await authApi.logout({ refreshToken: session.refreshToken });
    } finally {
      setSession(null);
    }
  };

  useEffect(() => {
    if (!session || !Number.isFinite(session.expiresIn) || session.expiresIn <= 0) {
      return;
    }

    const refreshDelay = Math.max(1000, session.expiresIn * 800);
    const timeoutId = setTimeout(() => {
      void refreshSession().catch((error: unknown) => {
        const message =
          error instanceof ApiError
            ? error.message
            : 'No se pudo renovar la sesión. Inicia sesión de nuevo.';
        Alert.alert('Sesión expirada', message);
      });
    }, refreshDelay);

    return () => clearTimeout(timeoutId);
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        accessToken: session?.accessToken ?? null,
        refreshToken: session?.refreshToken ?? null,
        currentUser: session?.user ?? null,
        isAuthenticated: session !== null,
        login,
        refreshSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function createSession(tokens: LoginResponse, email: string): AuthSession {
  if (!tokens.accessToken?.trim() || !tokens.refreshToken?.trim()) {
    throw new Error('La respuesta de autenticación no contiene los tokens requeridos.');
  }
  if (!Number.isFinite(tokens.expiresIn) || tokens.expiresIn <= 0) {
    throw new Error('La respuesta de autenticación no contiene un vencimiento válido.');
  }

  return {
    ...tokens,
    user: createUserFromToken(tokens.accessToken, email, tokens.role),
  };
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

function createUserFromToken(accessToken: string, email: string, responseRole: string): User {
  const claims = decodeTokenClaims(accessToken);
  const id = findClaim(claims, ['sub', 'id', 'userid', 'nameid']);
  const tokenEmail = findClaim(claims, ['email', 'emailaddress', 'unique_name']);
  const role = responseRole || findClaim(claims, ['role', 'roles']);
  const normalizedRole = role?.toUpperCase();

  return {
    ...(id !== undefined ? { id } : {}),
    email: tokenEmail ?? email,
    ...(normalizedRole === 'USER' ||
    normalizedRole === 'EDITOR' ||
    normalizedRole === 'MODERATOR' ||
    normalizedRole === 'ADMIN'
      ? { role: normalizedRole }
      : {}),
  };
}

function decodeTokenClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('El token de acceso no tiene un formato válido.');
  }

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = globalThis.atob(paddedBase64);
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  const claims: unknown = JSON.parse(json);

  if (claims === null || typeof claims !== 'object' || Array.isArray(claims)) {
    throw new Error('El token de acceso no contiene datos de usuario válidos.');
  }

  return claims as Record<string, unknown>;
}

function findClaim(
  claims: Record<string, unknown>,
  names: string[]
): string | undefined {
  const acceptedNames = names.map((name) => name.toLowerCase());
  const entry = Object.entries(claims).find(([key]) => {
    const normalizedKey = key.toLowerCase();
    return (
      acceptedNames.includes(normalizedKey) ||
      (normalizedKey.endsWith('/claims/role') && acceptedNames.includes('role')) ||
      (normalizedKey.endsWith('/claims/nameidentifier') &&
        acceptedNames.includes('nameid')) ||
      (normalizedKey.endsWith('/claims/emailaddress') &&
        acceptedNames.includes('emailaddress'))
    );
  });
  const value = Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;
}
