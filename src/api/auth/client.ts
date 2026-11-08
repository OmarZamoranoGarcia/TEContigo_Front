// src/api/client.ts
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../config/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

export async function request<T>(
  path: string,
  { method = 'GET', body, token, timeoutMs }: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const requestTimeoutMs = timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  let response: Response;
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        body === undefined
          ? undefined
          : isMultipart
            ? body
            : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new ApiError(
        'La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo.',
        0
      );
    }

    throw new ApiError(
      `No se pudo enviar la solicitud al servidor. ${describeFetchError(error)} Verifica que el iPhone esté en la misma red Wi-Fi que la computadora, que la API esté disponible en el puerto 8080 y que el firewall permita la conexión.`,
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await response.text();
  let data: any = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status);
  }

  return data as T;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function describeFetchError(error: unknown): string {
  if (!(error instanceof Error) || !error.message.trim()) {
    return 'Error de conexión del dispositivo.';
  }

  const safeMessage = error.message
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [oculto]')
    .replace(
      /\b(token|authorization|password|secret)\b\s*[:=]\s*[^\s,;]+/gi,
      '$1=[oculto]'
    )
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 120);

  return `Detalle técnico: ${safeMessage}.`;
}

function extractErrorMessage(data: any, status: number): string {
  // Formato de tu middleware global: { success: false, message }
  if (data?.message) {
    return data.message;
  }

  // Errores automáticos de ASP.NET al leer el JSON (ProblemDetails con "errors").
  if (data?.errors) {
    return 'Revisa los datos ingresados e inténtalo de nuevo.';
  }

  // El middleware de JWT responde 401/403 sin cuerpo.
  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión de nuevo.';
  }

  if (status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}