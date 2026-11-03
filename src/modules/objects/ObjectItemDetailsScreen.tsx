import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../AuthContext';
import { ApiError } from '../../api/auth/client';
import { contactRequestsApi } from '../../api/contactRequests/contactRequestsApi';
import { matchesApi } from '../../api/matches/matchesApi';
import type { ContactRequest, Match } from '../../api/types';
import type { ObjectItem, ObjectItemKind } from '../../api/objects/objectsApi';
import { PaginationControls } from '../../components/PaginationControls';

interface ObjectItemDetailsScreenProps {
  item: ObjectItem;
  kind: ObjectItemKind;
  onBack: () => void;
  onOpenRequests: () => void;
  onRefreshReady: (refresh: (() => Promise<void>) | null) => void;
}

export const ObjectItemDetailsScreen: React.FC<ObjectItemDetailsScreenProps> = ({
  item,
  kind,
  onBack,
  onOpenRequests,
  onRefreshReady,
}) => {
  const { accessToken, currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPageNumber, setMatchPageNumber] = useState(1);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [acting, setActing] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const userId = toNumber(currentUser?.id);
  const itemId = toNumber(item.id);
  const owner = userId !== null && userId === toNumber(item.userId);
  const found = kind === 'found';
  const pendingRequest = requests.find((request) =>
    request.requesterId === userId &&
    request.foundItem?.id === itemId &&
    request.status === 'Pendiente'
  );
  const receivedRequests = requests.filter((request) =>
    request.foundItem?.id === itemId &&
    request.foundItem.userId === userId &&
    request.status === 'Pendiente'
  );
  const active = normalizeStatus(item.status) === 'ACTIVO';
  const canRequestContact =
    found && requestsLoaded && !owner && active && !pendingRequest && currentUser?.role === 'USER';

  const loadMatches = useCallback(async () => {
    if (!accessToken) return;
    setLoadingMatches(true);
    setMatchesError(null);
    try {
      const allMatches = await loadAllMatches(accessToken);
      const relatedMatches = allMatches.filter((match) => {
        if (!match?.lostItem || !match.foundItem) return false;
        return (kind === 'lost' ? match.lostItem.id : match.foundItem.id) === itemId;
      });
      setMatches(relatedMatches);
      setMatchPageNumber((current) =>
        Math.min(current, Math.max(1, Math.ceil(relatedMatches.length / 20)))
      );
    } catch (reason) {
      setMatchesError(formatMatchesError(reason));
    } finally {
      setLoadingMatches(false);
    }
  }, [accessToken, itemId, kind]);

  const loadRequests = useCallback(async () => {
    if (!accessToken || !found) return;
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      setRequests(await contactRequestsApi.getAll(accessToken));
      setRequestsLoaded(true);
    } catch (reason) {
      setRequestsError(reason instanceof Error ? reason.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoadingRequests(false);
    }
  }, [accessToken, found]);

  useEffect(() => {
    void loadMatches();
    if (found) void loadRequests();
  }, [found, loadMatches, loadRequests]);

  const refreshDetails = useCallback(async () => {
    await Promise.all([loadMatches(), loadRequests()]);
  }, [loadMatches, loadRequests]);

  useEffect(() => {
    onRefreshReady(refreshDetails);
    return () => onRefreshReady(null);
  }, [onRefreshReady, refreshDetails]);

  const createRequest = () => {
    if (!accessToken || itemId === null || acting || !canRequestContact) return;
    Alert.alert(
      'Solicitar contacto',
      `¿Quieres pedir contacto a quien encontró "${item.article}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar solicitud',
          onPress: () => {
            void (async () => {
              setActing(true);
              try {
                await contactRequestsApi.create({ foundItemId: itemId }, accessToken);
                await loadRequests();
              } catch (reason) {
                Alert.alert(
                  'No se pudo enviar la solicitud',
                  reason instanceof Error ? reason.message : 'Inténtalo de nuevo.'
                );
              } finally {
                setActing(false);
              }
            })();
          },
        },
      ]
    );
  };

  const cancelRequest = async () => {
    if (!accessToken || !pendingRequest || acting) return;
    setActing(true);
    try {
      await contactRequestsApi.cancel(pendingRequest.id, accessToken);
      await loadRequests();
    } catch (reason) {
      Alert.alert(
        'No se pudo cancelar la solicitud',
        reason instanceof Error ? reason.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setActing(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={onBack} className="mr-3 py-2" accessibilityRole="button">
          <Text className="font-semibold text-blue-600">‹ Atrás</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-blue-900">
          {found ? 'Objeto encontrado' : 'Objeto perdido'}
        </Text>
      </View>
      {!accessToken ? (
        <Text className="m-4 text-center text-gray-500">Inicia sesión para consultar los detalles.</Text>
      ) : (
        <View className="px-4 pb-8 pt-4">
          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {item.photoUrl && (
              <Image source={{ uri: item.photoUrl }} className="h-56 w-full bg-gray-100" resizeMode="cover" />
            )}
            <View className="p-4">
              <Text className="text-xl font-bold text-gray-900">{item.article}</Text>
              <Text className="mt-1 font-semibold text-blue-600">{item.category}</Text>
              <Text className="mt-3 text-gray-600">Color: {item.color}</Text>
              <Text className="mt-1 text-gray-600">Lugar: {item.location}</Text>
              <Text className="mt-2 text-gray-600">{item.description}</Text>
              <Text className="mt-3 text-sm text-gray-500">Estado: {item.status}</Text>
            </View>
          </View>

          {found && owner && (
            <TouchableOpacity
              className="mt-4 items-center rounded-lg bg-blue-600 px-4 py-3"
              onPress={onOpenRequests}
              disabled={loadingRequests}
              accessibilityRole="button"
            >
              <Text className="font-bold text-white">
                {loadingRequests
                  ? 'Cargando solicitudes…'
                  : `Ver solicitudes recibidas${receivedRequests.length ? ` (${receivedRequests.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          )}

          {found && requestsError && (
            <View className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <Text className="mb-2 text-sm text-red-700">
                No se pudieron cargar las solicitudes: {requestsError}
              </Text>
              <TouchableOpacity onPress={() => void loadRequests()} accessibilityRole="button">
                <Text className="font-bold text-blue-700">Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {canRequestContact && (
            <TouchableOpacity
              className={`mt-4 items-center rounded-lg px-4 py-3 ${acting ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={createRequest}
              disabled={acting}
              accessibilityRole="button"
            >
              <Text className="font-bold text-white">
                {acting ? 'Enviando…' : 'Solicitar contacto'}
              </Text>
            </TouchableOpacity>
          )}

          {found && pendingRequest && (
            <View className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Text className="mb-3 text-center font-semibold text-blue-800">Solicitud enviada</Text>
              <TouchableOpacity
                className="items-center rounded-lg border border-blue-200 bg-white py-3"
                onPress={() => void cancelRequest()}
                disabled={acting}
                accessibilityRole="button"
              >
                <Text className="font-semibold text-blue-700">
                  {acting ? 'Cancelando…' : 'Cancelar solicitud'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {found && !owner && !active && (
            <Text className="mt-4 text-center text-gray-500">
              Este objeto ya no está activo y no puede recibir solicitudes.
            </Text>
          )}
          {found && owner && receivedRequests.length === 0 && (
            <Text className="mt-3 text-center text-gray-500">
              No hay solicitudes de contacto pendientes para este objeto.
            </Text>
          )}

          <Text className="mb-3 mt-6 text-lg font-bold text-blue-900">Posibles coincidencias</Text>
          {loadingMatches ? (
            <ActivityIndicator className="my-4" color="#2563eb" />
          ) : matchesError ? (
            <View className="rounded-lg border border-red-200 bg-red-50 p-3">
              <Text className="mb-2 text-sm text-red-700">
                No se pudieron cargar los matches: {matchesError}
              </Text>
              <TouchableOpacity onPress={() => void loadMatches()} accessibilityRole="button">
                <Text className="font-bold text-blue-700">Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : matches.length === 0 ? (
            <Text className="text-center text-gray-500">No hay matches asociados a este objeto.</Text>
          ) : (
            <>
              {matches
                .slice((matchPageNumber - 1) * 20, matchPageNumber * 20)
                .map((match) => (
                  <View key={match.id} className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
                    <Text className="font-semibold text-gray-900">
                      {kind === 'lost' ? match.foundItem.article : match.lostItem.article}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      Posible coincidencia del {Math.round(match.matchPercentage)}% · {match.status}
                    </Text>
                  </View>
                ))}
              <PaginationControls
                pageNumber={matchPageNumber}
                totalPages={Math.max(1, Math.ceil(matches.length / 20))}
                onPageChange={setMatchPageNumber}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
};

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeStatus(value: string): string {
  return value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function loadAllMatches(token: string): Promise<Match[]> {
  const firstPage = await matchesApi.getAll(token, 1);
  const matches = [...firstPage.items];

  for (let pageNumber = firstPage.pageNumber + 1; pageNumber <= firstPage.totalPages; pageNumber += 1) {
    const page = await matchesApi.getAll(token, pageNumber, firstPage.pageSize);
    matches.push(...page.items);
  }

  return matches;
}

function formatMatchesError(error: unknown): string {
  if (error instanceof ApiError) {
    return `El servidor respondió HTTP ${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'No se pudieron cargar los matches.';
}
