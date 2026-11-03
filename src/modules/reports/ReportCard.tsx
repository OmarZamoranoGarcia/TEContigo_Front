import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../AuthContext';
import type { Report } from '../../api/reports/reportsApi';

interface ReportCardProps {
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (report: Report) => void;
  onChangeStatus: (report: Report) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  onEdit,
  onDelete,
  onChangeStatus,
}) => {
  const { currentUser } = useAuth();
  const isOwner =
    currentUser?.id !== undefined && String(currentUser.id) === String(report.userId);
  const isEditor = currentUser?.role === 'EDITOR';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isModerator = currentUser?.role === 'MODERATOR';
  const canEdit = isOwner || isEditor || isAdmin || isModerator;
  const canDelete = isOwner || isAdmin || isModerator;
  const canChangeStatus = isAdmin || isModerator;

  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {report.photoUrl && (
        <Image
          source={{ uri: report.photoUrl }}
          className="h-40 w-full"
          resizeMode="cover"
          accessibilityLabel={`Imagen del reporte ${report.name}`}
        />
      )}

      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between">
          <Text className="flex-1 text-lg font-bold text-gray-900">{report.name}</Text>
          <View className={`rounded-full px-2 py-1 ${getStatusBackgroundColor(report.status)}`}>
            <Text className={`text-xs font-semibold ${getStatusTextColor(report.status)}`}>
              {report.status}
            </Text>
          </View>
        </View>

        <Text className="mb-2 font-medium text-blue-600">{report.category}</Text>
        <Text className="mb-3 text-base text-gray-600">{report.description}</Text>
        {formatCreatedAt(report.createdAt) !== null && (
          <Text className="mb-3 text-xs text-gray-400">
            {formatCreatedAt(report.createdAt)}
          </Text>
        )}

        {(canEdit || canDelete || canChangeStatus) && (
          <View className="flex-row gap-x-6 border-t border-gray-100 pt-2">
            {canEdit && (
              <TouchableOpacity
                className="py-2"
                onPress={() => onEdit(report)}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-blue-600">Editar</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                className="py-2"
                onPress={() => onDelete(report)}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-red-600">Eliminar</Text>
              </TouchableOpacity>
            )}
            {canChangeStatus && (
              <TouchableOpacity
                className="py-2"
                onPress={() => onChangeStatus(report)}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-purple-600">Cambiar estado</Text>
              </TouchableOpacity>
            )}
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_');
}

function formatCreatedAt(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

function getStatusBackgroundColor(status: string): string {
  switch (normalizeStatus(status)) {
    case 'PUBLICADO':
      return 'bg-yellow-100';
    case 'EN_PROCESO':
      return 'bg-blue-100';
    case 'TERMINADO':
      return 'bg-green-100';
    default:
      return 'bg-gray-100';
  }
}

function getStatusTextColor(status: string): string {
  switch (normalizeStatus(status)) {
    case 'PUBLICADO':
      return 'text-yellow-800';
    case 'EN_PROCESO':
      return 'text-blue-800';
    case 'TERMINADO':
      return 'text-green-800';
    default:
      return 'text-gray-800';
  }
}
