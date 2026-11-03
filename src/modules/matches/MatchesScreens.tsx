import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../AuthContext';
import { matchesApi } from '../../api/matches/matchesApi';
import { ApiError } from '../../api/auth/client';
import type { Match } from '../../api/types';
import { PaginationControls } from '../../components/PaginationControls';

interface MatchesListScreenProps {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
  onOpenConversation: (matchId: number) => void;
}

export const MatchesListScreen: React.FC<MatchesListScreenProps> = ({
  onBack,
  onOpenMatch,
  onOpenConversation,
}) => {
  const { accessToken } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page = 1, isRefresh = false) => {
    if (!accessToken) return;
    setError(null);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await matchesApi.getAll(accessToken, page);
      setMatches(result.items);
      setPageNumber(result.pageNumber);
      setTotalPages(result.totalPages);
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View className="flex-1 px-4 pt-12">
      <PageHeader title="Matches" onBack={onBack} />
      {loading ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={error ? [] : matches}
          keyExtractor={(match) => String(match.id)}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(1, true)}
            />
          }
          ListEmptyComponent={
            error ? null : (
              <StateMessage message="Todavía no hay posibles coincidencias para tus objetos." />
            )
          }
          ListHeaderComponent={
            error ? <RetryMessage message={error} onRetry={() => void load()} /> : null
          }
          ListFooterComponent={
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={totalPages}
              onPageChange={(page) => void load(page)}
              disabled={loading || refreshing}
            />
          }
          renderItem={({ item }) => (
            <View
              className={`mb-3 rounded-xl border border-gray-200 bg-white p-4 ${
                item.status === 'Cerrado' ? 'opacity-60' : ''
              }`}
            >
              <TouchableOpacity
                onPress={() => onOpenMatch(item.id)}
                accessibilityRole="button"
              >
                <View className="flex-row gap-2">
                  <MatchObjectPreview label="Perdido" item={item.lostItem} />
                  <MatchObjectPreview label="Encontrado" item={item.foundItem} />
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <View>
                    <Text className="font-bold text-blue-700">
                      {Math.round(item.matchPercentage)}% · {similarityLabel(item.matchPercentage)}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <Text className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    {item.status}
                  </Text>
                </View>
                <View className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <View
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.max(0, Math.min(100, item.matchPercentage))}%` }}
                  />
                </View>
              </TouchableOpacity>
              {item.status === 'ChatActivo' ? (
                <TouchableOpacity
                  className="mt-3 items-center rounded-lg bg-blue-600 px-4 py-3"
                  onPress={() => onOpenConversation(item.id)}
                  accessibilityRole="button"
                >
                  <Text className="font-bold text-white">Ir al chat</Text>
                </TouchableOpacity>
              ) : item.status === 'Cerrado' ? (
                <Text className="mt-3 font-semibold text-gray-600">Cerrado</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
};

interface MatchDetailsScreenProps {
  matchId: number;
  onBack: () => void;
  onOpenConversation: (matchId: number) => void;
}

export const MatchDetailsScreen: React.FC<MatchDetailsScreenProps> = ({
  matchId,
  onBack,
  onOpenConversation,
}) => {
  const { accessToken, currentUser } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = numericUserId(currentUser?.id);
  const isLostUser = match !== null && userId === match.lostItem.userId;
  const ownFlag = match !== null && (isLostUser
    ? match.lostUserChatRequest
    : match.foundUserChatRequest);
  const otherFlag = match !== null && (isLostUser
    ? match.foundUserChatRequest
    : match.lostUserChatRequest);
  const isParticipant = match !== null && userId !== null &&
    (userId === match.lostItem.userId || userId === match.foundItem.userId);
  const canRequestChat = currentUser?.role === 'USER' &&
    isParticipant &&
    match?.status === 'Pendiente';

  const refreshMatch = useCallback(async (
    showLoading = false,
    isRefresh = false
  ): Promise<Match | null> => {
    if (!accessToken) return null;
    if (showLoading) setLoading(true);
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const updated = await matchesApi.getById(matchId, accessToken);
      setMatch(updated);
      return updated;
    } catch (reason) {
      setError(messageFor(reason));
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, matchId]);

  useEffect(() => {
    void refreshMatch(true);
  }, [refreshMatch]);

  useEffect(() => {
    if (!canRequestChat || !ownFlag) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const startPolling = () => {
      if (timer === null) timer = setInterval(() => void refreshMatch(), 5000);
    };
    if (AppState.currentState === 'active') startPolling();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshMatch();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      appStateSubscription.remove();
    };
  }, [canRequestChat, ownFlag, refreshMatch]);

  const toggleChat = async () => {
    if (!accessToken || !match || acting || !canRequestChat) return;
    setActing(true);
    try {
      const response = await matchesApi.requestChat(match.id, accessToken);
      const updated = await refreshMatch();
      if (response.bothUsersAccepted || updated?.status === 'ChatActivo') {
        onOpenConversation(match.id);
      }
    } catch (reason) {
      await refreshMatch();
      if (reason instanceof ApiError && reason.status === 400) {
        Alert.alert(
          'Chat activo',
          reason.message,
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Ir al chat', onPress: () => onOpenConversation(match.id) },
          ]
        );
      } else {
        Alert.alert('No se pudo cambiar la solicitud', messageFor(reason));
      }
    } finally {
      setActing(false);
    }
  };

  return (
    <View className="flex-1 px-4 pt-16">
      <PageHeader title="Detalle del match" onBack={onBack} />
      {loading ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : error || !match ? (
        <RetryMessage
          message={error ?? 'No se encontró el match.'}
          onRetry={() => void refreshMatch(true)}
        />
      ) : (
        <ScrollView
          className="flex-1"
          alwaysBounceVertical
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshMatch(false, true)}
            />
          }
        >
          <View className="flex-row gap-2">
            <MatchObjectDetails
              label="Perdido"
              item={match.lostItem}
              isMine={userId !== null && match.lostItem.userId === userId}
            />
            <MatchObjectDetails
              label="Encontrado"
              item={match.foundItem}
              isMine={userId !== null && match.foundItem.userId === userId}
            />
          </View>
          <Text className="mt-4 text-lg font-bold text-blue-800">
            Coincidencia {Math.round(match.matchPercentage)}% · {similarityLabel(match.matchPercentage)}
          </Text>
          <Text className="mt-2 text-gray-600">
            Estado: {match.status} · {formatDate(match.createdAt)}
          </Text>

          {match.status === 'ChatActivo' ? (
            <TouchableOpacity
              className="mt-5 items-center rounded-lg bg-blue-600 px-4 py-3"
              onPress={() => onOpenConversation(match.id)}
              accessibilityRole="button"
            >
              <Text className="font-bold text-white">Ir al chat</Text>
            </TouchableOpacity>
          ) : match.status === 'Pendiente' && canRequestChat ? (
            <View className="mt-5 flex-row items-center justify-between rounded-xl border border-blue-100 bg-white p-4">
              <View className="mr-3 flex-1">
                <Text className="font-bold text-gray-900">Quiero chatear</Text>
                <Text className="mt-1 text-sm text-gray-600">
                  {ownFlag && !otherFlag
                    ? 'Esperando a que la otra persona acepte'
                    : !ownFlag && otherFlag
                      ? 'La otra persona quiere chatear contigo'
                      : ownFlag && otherFlag
                        ? 'Ambos quieren chatear; esperando que se active el chat'
                        : 'Activa esta opción si quieres iniciar una conversación'}
                </Text>
              </View>
              <Switch
                value={ownFlag}
                onValueChange={() => void toggleChat()}
                disabled={acting}
                accessibilityLabel="Quiero chatear"
              />
            </View>
          ) : match.status === 'Cerrado' ? (
            <Text className="mt-5 rounded-lg bg-gray-100 p-4 text-gray-600">
              Este match está cerrado y solo puede consultarse.
            </Text>
          ) : (
            <Text className="mt-5 rounded-lg bg-gray-100 p-4 text-gray-600">
              Vista de solo lectura.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const MatchObjectPreview: React.FC<{
  label: string;
  item: Match['lostItem'];
}> = ({ label, item }) => (
  <View className="flex-1 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
    {item.photoUrl ? (
      <Image
        source={{ uri: item.photoUrl }}
        className="h-24 w-full bg-gray-100"
        resizeMode="cover"
      />
    ) : (
      <View className="h-24 items-center justify-center bg-gray-100">
        <Text className="text-xs text-gray-400">Sin foto</Text>
      </View>
    )}
    <View className="p-2">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="font-semibold text-gray-900" numberOfLines={1}>{item.article}</Text>
      <Text className="text-xs text-gray-500" numberOfLines={1}>
        {item.color} · {item.location}
      </Text>
    </View>
  </View>
);

const MatchObjectDetails: React.FC<{
  label: string;
  item: Match['lostItem'];
  isMine: boolean;
}> = ({ label, item, isMine }) => (
  <View className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
    {item.photoUrl ? (
      <Image
        source={{ uri: item.photoUrl }}
        className="h-36 w-full bg-gray-100"
        resizeMode="cover"
      />
    ) : (
      <View className="h-36 items-center justify-center bg-gray-100">
        <Text className="text-gray-500">Sin foto</Text>
      </View>
    )}
    <View className="p-3">
      <Text className="text-xs font-semibold text-blue-700">
        {label} · {isMine ? 'Mi objeto' : 'Objeto de la otra persona'}
      </Text>
      <Text className="mt-1 text-base font-bold text-gray-900">{item.article}</Text>
      <Text className="mt-2 text-sm text-gray-600">Categoría: {item.category}</Text>
      <Text className="text-sm text-gray-600">Color: {item.color}</Text>
      <Text className="text-sm text-gray-600">Lugar: {item.location}</Text>
      <Text className="mt-2 text-sm text-gray-700">{item.description}</Text>
      <Text className="mt-2 text-xs text-gray-500">Estado del objeto: {item.status}</Text>
    </View>
  </View>
);

const PageHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View className="mb-4 flex-row items-center">
    <TouchableOpacity className="mr-3 py-2" onPress={onBack} accessibilityRole="button">
      <Text className="font-semibold text-blue-600">‹ Atrás</Text>
    </TouchableOpacity>
    <Text className="flex-1 text-2xl font-bold text-blue-900">{title}</Text>
  </View>
);

const RetryMessage: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <View className="rounded-xl border border-red-200 bg-red-50 p-4">
    <Text className="mb-3 text-red-700">{message}</Text>
    <TouchableOpacity onPress={onRetry} accessibilityRole="button">
      <Text className="font-bold text-blue-700">Reintentar</Text>
    </TouchableOpacity>
  </View>
);

const StateMessage: React.FC<{ message: string }> = ({ message }) => (
  <Text className="py-8 text-center text-gray-500">{message}</Text>
);

function similarityLabel(percentage: number): string {
  if (percentage >= 85) return 'Muy parecido';
  if (percentage >= 70) return 'Parecido';
  return 'Posible';
}

function numericUserId(id: string | undefined): number | null {
  if (id === undefined) return null;
  const parsed = Number(id);
  return Number.isInteger(parsed) ? parsed : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString();
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Inténtalo de nuevo.';
}
