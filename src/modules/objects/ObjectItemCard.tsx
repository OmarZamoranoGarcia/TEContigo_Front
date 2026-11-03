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
    <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
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
          <Text className="mr-2 flex-1 text-lg font-bold text-gray-900">{item.article}</Text>
          <View
            className={`rounded-full px-2 py-1 ${
              normalizeStatus(item.status) === 'DEVUELTO' ? 'bg-green-100' : 'bg-blue-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                normalizeStatus(item.status) === 'DEVUELTO' ? 'text-green-800' : 'text-blue-800'
              }`}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text className="mb-2 font-medium text-blue-600">{item.category}</Text>
        <Text className="mb-1 text-gray-600">Color: {item.color}</Text>
        <Text className="mb-2 text-gray-600">Lugar: {item.location}</Text>
        <Text className="mb-3 text-base text-gray-600">{item.description}</Text>
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
            <Text className="font-semibold text-blue-600">Ver detalles</Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <View className="flex-row gap-x-6 border-t border-gray-100 pt-2">
            <TouchableOpacity
              className="py-2"
              onPress={() => onEdit(item)}
              accessibilityRole="button"
            >
              <Text className="font-semibold text-blue-600">Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-2"
              onPress={() => onDelete(item)}
              accessibilityRole="button"
            >
              <Text className="font-semibold text-red-600">Eliminar</Text>
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
