import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../AuthContext';
import {
  objectsApi,
  type ObjectItem,
  type ObjectItemFields,
  type ObjectItemKind,
} from '../../api/objects/objectsApi';
import { ObjectItemFormModal } from './ObjectItemFormModal';
import { ObjectItemDetailsScreen } from './ObjectItemDetailsScreen';
import { FoundItemCard } from './foundItems/FoundItemCard';
import { LostItemCard } from './lostItems/LostItemCard';
import { PaginationControls } from '../../components/PaginationControls';

interface ObjectItemsScreenProps {
  kind: ObjectItemKind;
  onOpenRequests: () => void;
  onRefreshReady: (refresh: (() => Promise<void>) | null) => void;
}

export const ObjectItemsScreen: React.FC<ObjectItemsScreenProps> = ({
  kind,
  onOpenRequests,
  onRefreshReady,
}) => {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ObjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [itemBeingEdited, setItemBeingEdited] = useState<ObjectItem | null>(null);
  const [itemBeingViewed, setItemBeingViewed] = useState<ObjectItem | null>(null);

  const isLost = kind === 'lost';
  const itemType = isLost ? 'perdido' : 'encontrado';
  const title = isLost ? 'Objetos perdidos' : 'Objetos encontrados';

  const loadItems = useCallback(async (
    requestedPage = 1,
    refresh = false
  ): Promise<ObjectItem[] | null> => {
    if (!accessToken) {
      setItems([]);
      setIsLoading(false);
      setPageNumber(1);
      setTotalPages(1);
      return null;
    }

    if (!refresh) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const page = await objectsApi.list(kind, accessToken, requestedPage);
      setItems(page.items);
      setPageNumber(page.pageNumber);
      setTotalPages(page.totalPages);
      return page.items;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron cargar los objetos.'
      );
      return null;
    } finally {
      if (!refresh) {
        setIsLoading(false);
      }
    }
  }, [accessToken, kind]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (itemBeingViewed) return;
    onRefreshReady(async () => {
      await loadItems(pageNumber, true);
    });
    return () => onRefreshReady(null);
  }, [itemBeingViewed, loadItems, onRefreshReady, pageNumber]);

  const showRequestError = (error: unknown) => {
    Alert.alert(
      'No se pudo completar la operación',
      error instanceof Error ? error.message : 'Inténtalo de nuevo.'
    );
  };

  const handleSave = async (fields: ObjectItemFields) => {
    if (!accessToken) {
      showRequestError(new Error('Inicia sesión para administrar objetos.'));
      return;
    }

    try {
      if (itemBeingEdited) {
        await objectsApi.update(kind, itemBeingEdited.id, fields, accessToken);
        const updatedItems = await loadItems(pageNumber);
        const updatedItem = updatedItems?.find(
          (item) => String(item.id) === String(itemBeingEdited.id)
        );
        if (
          !updatedItem ||
          updatedItem.category !== fields.category ||
          updatedItem.article !== fields.article ||
          updatedItem.color !== fields.color ||
          updatedItem.location !== fields.location ||
          updatedItem.description !== fields.description ||
          normalizeStatus(updatedItem.status) !== normalizeStatus(fields.status)
        ) {
          throw new Error(
            'El servidor aceptó la edición, pero al volver a consultar el objeto siguen apareciendo los datos anteriores. No se confirmó que los cambios se guardaran.'
          );
        }
      } else {
        await objectsApi.create(kind, fields, accessToken);
        await loadItems();
      }
      setIsFormVisible(false);
      setItemBeingEdited(null);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleDelete = (item: ObjectItem) => {
    Alert.alert('Eliminar objeto', `¿Deseas eliminar "${item.article}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!accessToken) {
              showRequestError(new Error('Inicia sesión para administrar objetos.'));
              return;
            }
            try {
              await objectsApi.delete(kind, item.id, accessToken);
              await loadItems();
            } catch (error) {
              showRequestError(error);
            }
          })();
        },
      },
    ]);
  };

  const openCreateForm = () => {
    setItemBeingEdited(null);
    setIsFormVisible(true);
  };

  const openEditForm = (item: ObjectItem) => {
    setItemBeingEdited(item);
    setIsFormVisible(true);
  };

  if (itemBeingViewed) {
    return (
      <ObjectItemDetailsScreen
        item={itemBeingViewed}
        kind={kind}
        onBack={() => setItemBeingViewed(null)}
        onOpenRequests={onOpenRequests}
        onRefreshReady={onRefreshReady}
      />
    );
  }

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">{title}</Text>
        <TouchableOpacity
          className="rounded-lg bg-blue-600 px-4 py-3"
          onPress={openCreateForm}
          accessibilityRole="button"
        >
          <Text className="font-bold text-white">Publicar</Text>
        </TouchableOpacity>
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : errorMessage && items.length === 0 ? (
        <View className="rounded-xl border border-red-200 bg-red-50 p-4">
          <Text className="mb-3 text-red-700">{errorMessage}</Text>
          <TouchableOpacity onPress={() => void loadItems()} accessibilityRole="button">
            <Text className="font-bold text-blue-700">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <Text className="py-8 text-center text-gray-500">
          Todavía no hay objetos {itemType === 'perdido' ? 'perdidos' : 'encontrados'}.
        </Text>
      ) : (
        <>
          {errorMessage && (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <Text className="mb-3 text-red-700">{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => void loadItems(pageNumber, true)}
                disabled={isLoading}
                accessibilityRole="button"
              >
                <Text className="font-bold text-blue-700">Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}
          {items.map((item) =>
            isLost ? (
              <LostItemCard
                key={String(item.id)}
                item={item}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onSelect={setItemBeingViewed}
              />
            ) : (
              <FoundItemCard
                key={String(item.id)}
                item={item}
                onEdit={openEditForm}
                onDelete={handleDelete}
                onSelect={setItemBeingViewed}
              />
            )
          )}
          <PaginationControls
            pageNumber={pageNumber}
            totalPages={totalPages}
            onPageChange={(page) => void loadItems(page)}
            disabled={isLoading}
          />
        </>
      )}

      <ObjectItemFormModal
        visible={isFormVisible}
        item={itemBeingEdited}
        itemType={itemType}
        onCancel={() => {
          setIsFormVisible(false);
          setItemBeingEdited(null);
        }}
        onSubmit={handleSave}
      />
    </View>
  );
};

function normalizeStatus(status: string): string {
  return status
    .trim()
    .toLocaleUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_');
}
