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

  const statusStyles = getStatusStyle(report.status);

  return (
    <View className="reportcard mb-4 overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
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
          <Text className="mr-4 flex-1 text-lg font-bold text-gray-900 dark:text-white">
            {report.name}
          </Text>
          <View className={`ml-2 rounded-full px-2 py-1 ${statusStyles.bg}`}>
            <Text className={`text-xs font-semibold ${statusStyles.text}`}>
              {report.status}
            </Text>
          </View>
        </View>

        <Text className="mb-2 text-sm font-medium text-gray-500 dark:text-white">
          {report.category}
        </Text>
        <Text className="mb-4 text-base text-gray-600 dark:text-white">
          {report.description}
        </Text>
        {formatCreatedAt(report.createdAt) !== null && (
          <Text className="mb-3 text-xs text-gray-400 dark:text-gray-400">
            {formatCreatedAt(report.createdAt)}
          </Text>
        )}

        {(canEdit || canDelete || canChangeStatus) && (
          <View className="flex-row gap-x-3 border-t border-gray-300 dark:border-white pt-4">
            {canEdit && (
              <TouchableOpacity
                accessibilityRole="button"
                className="items-center justify-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1.5 dark:border-blue-800 dark:bg-blue-500"
                onPress={() => onEdit(report)}
              >
                <Text className="text-sm font-semibold text-blue-700 dark:text-white">
                  Editar
                </Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                accessibilityRole="button"
                className="items-center justify-center rounded-full border border-red-200 bg-red-100 px-4 py-1.5 dark:border-red-800 dark:bg-red-500"
                onPress={() => onDelete(report)}
              >
                <Text className="text-sm font-semibold text-red-700 dark:text-white">
                  Eliminar
                </Text>
              </TouchableOpacity>
            )}
            {canChangeStatus && (
              <TouchableOpacity
                accessibilityRole="button"
                className="items-center justify-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1.5 dark:border-purple-800 dark:bg-purple-900/30"
                onPress={() => onChangeStatus(report)}
              >
                <Text className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                  Cambiar Estado
                </Text>
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

function getStatusStyle(status: string): { bg: string; text: string } {
  switch (normalizeStatus(status)) {
    case 'PUBLICADO':
      return { bg: 'bg-publicado', text: 'text-publicado' };
    case 'EN_PROCESO':
      return { bg: 'bg-proceso', text: 'text-proceso' };
    case 'TERMINADO':
      return { bg: 'bg-terminado', text: 'text-terminado' };
    default:
      return { bg: 'bg-red-800', text: 'text-black dark:text-white font-bold' };
  }
}
