import { File } from 'expo-file-system';

export interface PhotoUpload {
  uri: string;
  name: string;
  type: string;
}

export async function appendPhoto(formData: FormData, photo: PhotoUpload): Promise<void> {
  const file = new File(photo.uri);
  formData.append('Photo', file, photo.name);
}
