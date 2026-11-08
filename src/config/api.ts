// src/config/api.ts
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredApiUrl) {
  throw new Error('Define EXPO_PUBLIC_API_URL en el archivo .env.');
}

// Android Emulator usa 10.0.2.2 para acceder al localhost de la computadora.
export const API_BASE_URL =
  Platform.OS === 'android'
    ? configuredApiUrl.replace('://localhost', '://10.0.2.2')
    : configuredApiUrl;

export const REQUEST_TIMEOUT_MS = 15000;
export const PHOTO_UPLOAD_TIMEOUT_MS = 120000;