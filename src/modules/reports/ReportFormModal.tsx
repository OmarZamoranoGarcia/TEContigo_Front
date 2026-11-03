import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Report, ReportFields, ReportPhoto } from '../../api/reports/reportsApi';

interface ReportFormModalProps {
  visible: boolean;
  report: Report | null;
  onCancel: () => void;
  onSubmit: (fields: ReportFields) => Promise<void>;
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  visible,
  report,
  onCancel,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(report?.name ?? '');
    setCategory(report?.category ?? '');
    setDescription(report?.description ?? '');
    setPhoto(null);
  }, [report, visible]);

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) {
        Alert.alert('No se pudo seleccionar la imagen', 'Intenta elegir otra foto.');
        return;
      }

      setPhoto({
        uri: asset.uri,
        name: asset.fileName ?? asset.uri.split('/').pop() ?? 'reporte.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
    } catch (error) {
      Alert.alert(
        'No se pudo abrir la galería',
        error instanceof Error ? error.message : 'Intenta de nuevo.'
      );
    }
  };

  const handleSubmit = async () => {
    const fields = {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      ...(photo ? { photo } : {}),
    };

    if (!fields.name || !fields.category || !fields.description) {
      Alert.alert('Completa los campos', 'Nombre, categoría y descripción son obligatorios.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(fields);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center bg-black/40 px-6">
        <ScrollView
          className="max-h-[85%] rounded-xl bg-white dark:bg-gray-800"
          contentContainerClassName="p-5"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            {report ? 'Editar reporte' : 'Crear reporte'}
          </Text>

          <TextInput
            className="mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white"
            placeholder="Nombre"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <TextInput
            className="mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white"
            placeholder="Categoría"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
            maxLength={50}
          />
          <TextInput
            className="mb-4 min-h-28 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white"
            placeholder="Descripción"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            className="mb-3 self-start rounded-lg border border-blue-200 dark:border-blue-800 px-4 py-3"
            onPress={() => void handlePickPhoto()}
            accessibilityRole="button"
          >
            <Text className="font-semibold text-blue-700 dark:text-blue-400">
              {photo ? 'Cambiar foto' : 'Adjuntar foto'}
            </Text>
          </TouchableOpacity>
          {photo && (
            <View className="mb-4">
              <Image
                source={{ uri: photo.uri }}
                className="mb-2 h-40 w-full rounded-lg"
                resizeMode="cover"
                accessibilityLabel="Vista previa de la foto del reporte"
              />
              <TouchableOpacity
                className="self-start py-1"
                onPress={() => setPhoto(null)}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-red-600 dark:text-red-400">Quitar foto</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row justify-end gap-3">
            <TouchableOpacity className="rounded-lg px-4 py-3" onPress={onCancel}>
              <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`rounded-lg px-4 py-3 ${isSaving ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={handleSubmit}
              disabled={isSaving}
              accessibilityRole="button"
            >
              <Text className="font-semibold text-white">
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
