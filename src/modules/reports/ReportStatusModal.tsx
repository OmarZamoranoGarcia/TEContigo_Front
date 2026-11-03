import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export const REPORT_STATUSES = [
  { label: 'Publicado', value: 'PUBLICADO' },
  { label: 'En proceso', value: 'EN_PROCESO' },
  { label: 'Terminado', value: 'TERMINADO' },
] as const;

interface ReportStatusModalProps {
  visible: boolean;
  currentStatus: string | null;
  onCancel: () => void;
  onSelect: (status: string) => void;
}

function normalizeStatus(status: string | null): string | null {
  return status
    ?.toLocaleUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_') ?? null;
}

export const ReportStatusModal: React.FC<ReportStatusModalProps> = ({
  visible,
  currentStatus,
  onCancel,
  onSelect,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View className="flex-1 justify-center bg-black/40 px-6">
      <View className="rounded-xl bg-white dark:bg-gray-800 p-5">
        <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Cambiar estado</Text>
        {REPORT_STATUSES.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            className="border-b border-gray-100 dark:border-gray-700 py-3"
            onPress={() => onSelect(value)}
            accessibilityRole="button"
            disabled={normalizeStatus(currentStatus) === value}
          >
            <Text
              className={`font-semibold ${
                normalizeStatus(currentStatus) === value
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity className="mt-3 self-end px-3 py-2" onPress={onCancel}>
          <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
