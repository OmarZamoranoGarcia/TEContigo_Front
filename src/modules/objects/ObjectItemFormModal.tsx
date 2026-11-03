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
import type {
  ObjectItem,
  ObjectItemFields,
  ObjectItemPhoto,
} from '../../api/objects/objectsApi';

interface ObjectItemFormModalProps {
  visible: boolean;
  item: ObjectItem | null;
  itemType: 'perdido' | 'encontrado';
  onCancel: () => void;
  onSubmit: (fields: ObjectItemFields) => Promise<void>;
}

export const ObjectItemFormModal: React.FC<ObjectItemFormModalProps> = ({
  visible,
  item,
  itemType,
  onCancel,
  onSubmit,
}) => {
  const [category, setCategory] = useState('');
  const [article, setArticle] = useState('');
  const [color, setColor] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Activo');
  const [photo, setPhoto] = useState<ObjectItemPhoto | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCategory(item?.category ?? '');
    setArticle(item?.article ?? '');
    setColor(item?.color ?? '');
    setLocation(item?.location ?? '');
    setDescription(item?.description ?? '');
    setStatus(item?.status ?? 'Activo');
    setPhoto(null);
  }, [item, visible]);

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
        name: asset.fileName ?? asset.uri.split('/').pop() ?? 'objeto.jpg',
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
      category: category.trim(),
      article: article.trim(),
      color: color.trim(),
      location: location.trim(),
      description: description.trim(),
      status,
      ...(photo ? { photo } : {}),
    };

    if (
      !fields.category ||
      !fields.article ||
      !fields.color ||
      !fields.location ||
      !fields.description
    ) {
      Alert.alert(
        'Completa los campos',
        'Categoría, artículo, color, lugar y descripción son obligatorios.'
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(fields);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center bg-black/40 px-6">
        <ScrollView
          className="max-h-[85%] rounded-xl bg-white dark:bg-gray-800"
          contentContainerClassName="p-5"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
            {item ? 'Editar objeto' : `Publicar objeto ${itemType}`}
          </Text>

          <TextInput
            className={inputClass}
            placeholder="Categoría"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
            maxLength={50}
          />
          <TextInput
            className={inputClass}
            placeholder="Artículo"
            placeholderTextColor="#9CA3AF"
            value={article}
            onChangeText={setArticle}
            maxLength={50}
          />
          <TextInput
            className={inputClass}
            placeholder="Color"
            placeholderTextColor="#9CA3AF"
            value={color}
            onChangeText={setColor}
            maxLength={50}
          />
          <TextInput
            className={inputClass}
            placeholder="Lugar donde se perdió o encontró"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
            maxLength={50}
          />
          <TextInput
            className="mb-4 min-h-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white"
            placeholder="Descripción"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Text className="mb-2 font-semibold text-gray-700 dark:text-gray-300">Estado</Text>
          <View className="mb-4 flex-row gap-3">
            {['Activo', 'Devuelto'].map((option) => (
              <TouchableOpacity
                key={option}
                className={`rounded-lg border px-4 py-2 ${
                  status === option
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                onPress={() => setStatus(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: status === option }}
              >
                <Text
                  className={
                    status === option
                      ? 'font-semibold text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            className="mb-3 self-start rounded-lg border border-blue-200 dark:border-blue-800 px-4 py-3"
            onPress={() => void handlePickPhoto()}
            accessibilityRole="button"
          >
            <Text className="font-semibold text-blue-700 dark:text-blue-400">
              {photo ? 'Cambiar foto' : item?.photoUrl ? 'Cambiar foto' : 'Adjuntar foto'}
            </Text>
          </TouchableOpacity>
          {photo && (
            <View className="mb-4">
              <Image
                source={{ uri: photo.uri }}
                className="mb-2 h-40 w-full rounded-lg"
                resizeMode="cover"
                accessibilityLabel="Vista previa de la foto del objeto"
              />
              <TouchableOpacity
                className="self-start py-1"
                onPress={() => setPhoto(null)}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-red-600 dark:text-red-400">Quitar foto nueva</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row justify-end gap-3">
            <TouchableOpacity className="rounded-lg px-4 py-3" onPress={onCancel}>
              <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`rounded-lg px-4 py-3 ${isSaving ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={() => void handleSubmit()}
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
