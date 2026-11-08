import type { ImagePickerAsset } from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getPickedPhoto(asset: ImagePickerAsset, fallbackName: string): PickedPhoto {
  const uriName = getUriFileName(asset.uri);
  const name = asset.fileName || uriName || fallbackName;
  const type =
    asset.mimeType ||
    getMimeType(uriName) ||
    getMimeType(name) ||
    'image/jpeg';

  return { uri: asset.uri, name, type };
}

function getUriFileName(uri: string): string | null {
  const path = uri.split(/[?#]/, 1)[0];
  const fileName = path.split('/').pop();
  return fileName || null;
}

function getMimeType(fileName: string | null): string | undefined {
  const extension = fileName?.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
  return extension ? MIME_TYPES_BY_EXTENSION[extension] : undefined;
}
