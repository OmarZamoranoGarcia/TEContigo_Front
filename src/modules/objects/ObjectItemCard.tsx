import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../AuthContext';
import type { ObjectItem } from '../../api/objects/objectsApi';

export interface ObjectItemCardProps {
  item: ObjectItem;
  onEdit: (item: ObjectItem) => void;
  onDelete: (item: ObjectItem) => void;
  onSelect?: (item: ObjectItem) => void;
}

interface ObjectItemCardBaseProps extends ObjectItemCardProps {
  itemType: 'perdido' | 'encontrado';
}

export const ObjectItemCard: React.FC<ObjectItemCardBaseProps> = ({
  item,
  itemType,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const { currentUser } = useAuth();
  const isOwner =
    currentUser?.id !== undefined && String(currentUser.id) === String(item.userId);
  const canManage = currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MODERATOR' ||
    (currentUser?.role === 'USER' && isOwner);

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {item.photoUrl && (
        <Image
          source={{ uri: item.photoUrl }}
          className="h-44 w-full"
          resizeMode="cover"
          accessibilityLabel={`Foto del artículo ${item.article}`}
        />
      )}

      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between">
          <Text className="mr-2 flex-1 text-lg font-bold text-gray-900 dark:text-white">
            {item.article}
          </Text>
          <View
            className={`rounded-full px-2 py-1 ${
              normalizeStatus(item.status) === 'DEVUELTO'
                ? 'bg-green-100 dark:bg-green-900/40'
                : 'bg-blue-100 dark:bg-blue-900/40'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                normalizeStatus(item.status) === 'DEVUELTO'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-blue-800 dark:text-blue-300'
              }`}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text className="mb-2 font-medium text-blue-600 dark:text-blue-400">{item.category}</Text>
        <Text className="mb-1 text-gray-600 dark:text-gray-300">Color: {item.color}</Text>
        <Text className="mb-2 text-gray-600 dark:text-gray-300">Lugar: {item.location}</Text>
        <Text className="mb-3 text-base text-gray-600 dark:text-gray-200">{item.description}</Text>
        <Text className="mb-3 text-xs text-gray-400">
          {itemType === 'perdido' ? 'Objeto perdido' : 'Objeto encontrado'}
          {formatCreatedAt(item.createdAt) ? ` · ${formatCreatedAt(item.createdAt)}` : ''}
        </Text>

        {onSelect && (
          <TouchableOpacity
            className="mb-2 self-start py-2"
            onPress={() => onSelect(item)}
            accessibilityRole="button"
          >
            <Text className="font-semibold text-blue-600 dark:text-blue-400">Ver detalles</Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <View className="flex-row gap-x-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <TouchableOpacity
              className="items-center justify-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1.5 dark:border-blue-800 dark:bg-blue-500"
              onPress={() => onEdit(item)}
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-blue-700 dark:text-white">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center justify-center rounded-full border border-red-200 bg-red-100 px-4 py-1.5 dark:border-red-800 dark:bg-red-500"
              onPress={() => onDelete(item)}
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-red-700 dark:text-white">Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

function normalizeStatus(status: string): string {
  return status
    .toLocaleUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatCreatedAt(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}
