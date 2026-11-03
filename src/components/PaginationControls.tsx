import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface PaginationControlsProps {
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pageNumber,
  totalPages,
  onPageChange,
  disabled = false,
}) => {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(pageNumber, totalPages);

  return (
    <View className="mb-5 mt-2 flex-row flex-wrap items-center justify-center gap-2">
      <PageButton
        label="‹"
        accessibilityLabel="Página anterior"
        disabled={disabled || pageNumber <= 1}
        onPress={() => onPageChange(pageNumber - 1)}
      />
      {pages.map((page, index) =>
        page === null ? (
          <Text key={`ellipsis-${index}`} className="px-1 text-gray-500">
            …
          </Text>
        ) : (
          <PageButton
            key={page}
            label={String(page)}
            accessibilityLabel={`Página ${page}`}
            selected={page === pageNumber}
            disabled={disabled}
            onPress={() => onPageChange(page)}
          />
        )
      )}
      <PageButton
        label="›"
        accessibilityLabel="Página siguiente"
        disabled={disabled || pageNumber >= totalPages}
        onPress={() => onPageChange(pageNumber + 1)}
      />
    </View>
  );
};

function getVisiblePages(pageNumber: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, Math.min(pageNumber - 1, totalPages - 3));
  const pages: Array<number | null> = [1];

  if (start > 2) pages.push(null);
  for (let page = start; page < Math.min(totalPages, start + 3); page += 1) {
    pages.push(page);
  }
  if (start + 3 < totalPages) pages.push(null);
  pages.push(totalPages);

  return pages;
}

interface PageButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}

const PageButton: React.FC<PageButtonProps> = ({
  label,
  accessibilityLabel,
  onPress,
  selected = false,
  disabled = false,
}) => (
  <TouchableOpacity
    className={`min-w-10 items-center rounded-lg border px-3 py-2 ${
      selected ? 'border-blue-600 bg-blue-600' : 'border-blue-200 bg-white'
    } ${disabled && !selected ? 'opacity-50' : ''}`}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected, disabled }}
  >
    <Text className={`font-semibold ${selected ? 'text-white' : 'text-blue-700'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);
