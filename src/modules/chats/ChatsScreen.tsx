import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../AuthContext';
import { contactRequestsApi } from '../../api/contactRequests/contactRequestsApi';
import { conversationsApi } from '../../api/chats/conversationsApi';
import { messagesApi } from '../../api/chats/messagesApi';
import { matchesApi } from '../../api/matches/matchesApi';
import { notificationsApi } from '../../api/notifications/notificationsApi';
import { PaginationControls } from '../../components/PaginationControls';
import { MatchesListScreen, MatchDetailsScreen } from '../matches/MatchesScreens';
import type {
  AppNotification,
  ChatMessage,
  ContactRequest,
  Conversation,
  Match,
} from '../../api/types';

const PAGE_SIZE = 20;

type Page =
  | { name: 'home' }
  | { name: 'chat'; conversation: Conversation }
  | { name: 'matches' }
  | {
      name: 'match';
      matchId: number;
      returnTo: 'home' | 'matches' | 'chat';
      conversation?: Conversation;
    }
  | { name: 'requests' }
  | { name: 'notifications' };

export interface PushNotificationTarget {
  key: string;
  referenceType: 'Match' | 'Conversation' | 'ContactRequest';
  referenceId: number;
}

export const ChatsScreen: React.FC<{
  pushTarget?: PushNotificationTarget | null;
  startAt?: 'home' | 'requests';
}> = ({ pushTarget, startAt = 'home' }) => {
  const [page, setPage] = useState<Page>(
    startAt === 'requests' ? { name: 'requests' } : { name: 'home' }
  );
  const handledPushKey = useRef<string | null>(null);

  const goToConversation = useCallback((conversation: Conversation) => {
    setPage({ name: 'chat', conversation });
  }, []);

  const { accessToken } = useAuth();

  useEffect(() => {
    if (!pushTarget || !accessToken || handledPushKey.current === pushTarget.key) return;
    handledPushKey.current = pushTarget.key;
    if (pushTarget.referenceType === 'Match') {
      setPage({ name: 'match', matchId: pushTarget.referenceId, returnTo: 'home' });
    } else if (pushTarget.referenceType === 'ContactRequest') {
      setPage({ name: 'requests' });
    } else {
      void conversationsApi.getById(pushTarget.referenceId, accessToken)
        .then(goToConversation)
        .catch(showError);
    }
  }, [accessToken, goToConversation, pushTarget]);

  const goBack = () => setPage({ name: 'home' });
  const openConversationByRequest = useCallback(async (id: number) => {
    if (!accessToken) return;
    try {
      const conversations = await conversationsApi.getAll(accessToken);
      const conversation = conversations.find((item) => item.contactRequestId === id);
      if (!conversation) {
        Alert.alert('Chat no disponible', 'Todavía no se creó una conversación para esta solicitud.');
        return;
      }
      goToConversation(conversation);
    } catch (error) {
      showError(error);
    }
  }, [accessToken, goToConversation]);

  async function openConversationByMatch(matchId: number): Promise<void> {
    if (!accessToken) return;
    try {
      const conversation = await resolveConversationByMatchId(matchId, accessToken);
      if (!conversation) {
        Alert.alert(
          'Chat no disponible',
          'Todavía no se encontró la conversación para este match.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Reintentar', onPress: () => void openConversationByMatch(matchId) },
          ]
        );
        return;
      }
      goToConversation(conversation);
    } catch (error) {
      Alert.alert(
        'No se pudo abrir el chat',
        messageFor(error),
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: () => void openConversationByMatch(matchId) },
        ]
      );
    }
  }

  const openNotification = useCallback(async (notification: AppNotification) => {
    if (!accessToken) return;
    try {
      await notificationsApi.markAsRead(notification.id, accessToken);
      if (notification.referenceType === 'Match') {
        setPage({ name: 'match', matchId: notification.referenceId, returnTo: 'home' });
      } else if (notification.referenceType === 'Conversation') {
        const conversation = await conversationsApi.getById(
          notification.referenceId,
          accessToken
        );
        goToConversation(conversation);
      } else {
        setPage({ name: 'requests' });
      }
    } catch (error) {
      showError(error);
    }
  }, [accessToken, goToConversation]);

  if (!accessToken) {
    return <StateMessage message="Inicia sesión para consultar tus chats." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {page.name === 'home' && (
        <ConversationList
          onOpen={goToConversation}
          onMatches={() => setPage({ name: 'matches' })}
          onRequests={() => setPage({ name: 'requests' })}
          onNotifications={() => setPage({ name: 'notifications' })}
        />
      )}
      {page.name === 'chat' && (
        <ConversationThread
          conversation={page.conversation}
          onBack={goBack}
          onOpenMatch={(matchId) => setPage({
            name: 'match',
            matchId,
            returnTo: 'chat',
            conversation: page.conversation,
          })}
        />
      )}
      {page.name === 'matches' && (
        <MatchesListScreen
          onBack={goBack}
          onOpenMatch={(matchId) => setPage({
            name: 'match',
            matchId,
            returnTo: 'matches',
          })}
          onOpenConversation={(matchId) => void openConversationByMatch(matchId)}
        />
      )}
      {page.name === 'match' && (
        <MatchDetailsScreen
          matchId={page.matchId}
          onBack={() => {
            if (page.returnTo === 'chat' && page.conversation) {
              setPage({ name: 'chat', conversation: page.conversation });
            } else if (page.returnTo === 'matches') {
              setPage({ name: 'matches' });
            } else {
              setPage({ name: 'home' });
            }
          }}
          onOpenConversation={(id) => void openConversationByMatch(id)}
        />
      )}
      {page.name === 'requests' && (
        <ContactRequestsList
          onBack={goBack}
          onOpenConversation={(id) => void openConversationByRequest(id)}
        />
      )}
      {page.name === 'notifications' && (
        <NotificationsList
          onBack={goBack}
          onOpen={(notification) => void openNotification(notification)}
        />
      )}
    </View>
  );
};

interface ConversationListProps {
  onOpen: (conversation: Conversation) => void;
  onMatches: () => void;
  onRequests: () => void;
  onNotifications: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onOpen,
  onMatches,
  onRequests,
  onNotifications,
}) => {
  const { accessToken, currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMatchesCount, setNewMatchesCount] = useState(0);
  const [matchesCountError, setMatchesCountError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const loadMatchesCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await matchesApi.getAll(accessToken, 1);
      const userId = numericUserId(currentUser?.id);
      setNewMatchesCount(result.items.filter((match) => {
        if (match.status !== 'Pendiente' || userId === null) return false;
        if (match.lostItem.userId === userId) return !match.lostUserChatRequest;
        if (match.foundItem.userId === userId) return !match.foundUserChatRequest;
        return false;
      }).length);
      setMatchesCountError(null);
    } catch (reason) {
      setMatchesCountError(messageFor(reason));
    }
  }, [accessToken, currentUser?.id]);

  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    void loadMatchesCount();
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await conversationsApi.getAll(accessToken);
      setConversations(result);
      setPageNumber((current) =>
        Math.min(current, Math.max(1, Math.ceil(result.length / PAGE_SIZE)))
      );
      const notifications = await notificationsApi.getAll(accessToken);
      setUnreadCount(notifications.items.filter((item) => !item.isRead).length);
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, loadMatchesCount]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => appStateSubscription.remove();
  }, [load]);

  const userId = numericUserId(currentUser?.id);

  return (
    <View className="flex-1 px-4 pt-4">
      <Text className="mb-4 mt-8 text-3xl font-bold text-blue-900">Chats</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        <ActionChip
          label={`Matches${newMatchesCount > 0 ? ` (${newMatchesCount})` : ''}`}
          onPress={onMatches}
        />
        <ActionChip label="Solicitudes" onPress={onRequests} />
        <ActionChip label={`Notificaciones${unreadCount ? ` (${unreadCount})` : ''}`} onPress={onNotifications} />
      </View>
      {matchesCountError && (
        <View className="mb-3 flex-row items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
          <Text className="mr-2 flex-1 text-xs text-amber-800">
            No se pudo actualizar el indicador de matches. {matchesCountError}
          </Text>
          <TouchableOpacity onPress={() => void loadMatchesCount()} accessibilityRole="button">
            <Text className="text-xs font-bold text-blue-700">Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={error ? [] : conversations.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE)}
          keyExtractor={(item) => String(item.id)}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          ListHeaderComponent={error ? <RetryMessage message={error} onRetry={() => void load()} /> : null}
          ListEmptyComponent={
            error ? null : (
              <StateMessage message="Aún no tienes conversaciones. Puedes iniciar una desde un match o al solicitar contacto por un objeto encontrado." />
            )
          }
          ListFooterComponent={
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={Math.max(1, Math.ceil(conversations.length / PAGE_SIZE))}
              onPageChange={setPageNumber}
              disabled={refreshing}
            />
          }
          renderItem={({ item }) => {
            const isRequester = userId !== null && item.requesterId === userId;
            const roleLabel = isRequester ? 'Quien lo busca' : 'Quien lo encontró';
            return (
              <TouchableOpacity
                className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4"
                onPress={() => onOpen(item)}
                accessibilityRole="button"
              >
                {item.foundItem.photoUrl ? (
                  <Image
                    source={{ uri: item.foundItem.photoUrl }}
                    className="mr-3 h-14 w-14 rounded-lg bg-gray-100"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="mr-3 h-14 w-14 items-center justify-center rounded-lg bg-blue-50">
                    <Text className="text-xl text-blue-600">?</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-bold text-gray-900" numberOfLines={1}>
                    {item.foundItem.article}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    {roleLabel} · {formatDate(item.createdAt)}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-blue-700">
                    {item.matchId !== null ? 'Por coincidencia' : 'Por solicitud'}
                  </Text>
                </View>
                {item.closedAt && (
                  <Text className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    Cerrada
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

interface ConversationThreadProps {
  conversation: Conversation;
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
}

interface VisibleMessage extends ChatMessage {
  localId: string;
  delivery?: 'pending' | 'failed';
}

const ConversationThread: React.FC<ConversationThreadProps> = ({
  conversation: initialConversation,
  onBack,
  onOpenMatch,
}) => {
  const { accessToken, currentUser } = useAuth();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [relatedMatch, setRelatedMatch] = useState<Match | null>(null);
  const userId = numericUserId(currentUser?.id);
  const isParticipant = userId !== null &&
    (userId === conversation.requesterId || userId === conversation.finderId);
  const readOnly = currentUser?.role !== 'USER' || !isParticipant;
  const closed = conversation.closedAt !== null;
  const canSend = !readOnly && !closed && text.trim().length > 0 && !sending;
  const myConfirmed = userId === conversation.requesterId
    ? conversation.requesterConfirmedReturn
    : conversation.finderConfirmedReturn;
  const otherConfirmed = userId === conversation.requesterId
    ? conversation.finderConfirmedReturn
    : conversation.requesterConfirmedReturn;

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((current) => {
      const byId = new Map<number, VisibleMessage>();
      current.forEach((item) => {
        if (item.id > 0) byId.set(item.id, item);
      });
      incoming.forEach((item) => byId.set(item.id, { ...item, localId: `server-${item.id}` }));
      const pending = current.filter((item) => item.id < 0);
      return [...Array.from(byId.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ), ...pending];
    });
  }, []);

  const loadLatest = useCallback(async (showLoading = false) => {
    if (!accessToken) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [latest, freshConversation] = await Promise.all([
        messagesApi.getByConversation(conversation.id, accessToken, { pageNumber: 1, pageSize: 20 }),
        conversationsApi.getById(conversation.id, accessToken),
      ]);
      mergeMessages(latest.items);
      setPageNumber(latest.pageNumber);
      setTotalPages(latest.totalPages);
      setConversation(freshConversation);
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, conversation.id, mergeMessages]);

  const loadRelatedMatch = useCallback(async () => {
    if (!accessToken || conversation.matchId === null) {
      setRelatedMatch(null);
      return;
    }
    try {
      setRelatedMatch(await matchesApi.getById(conversation.matchId, accessToken));
    } catch {
      setRelatedMatch(null);
    }
  }, [accessToken, conversation.matchId]);

  useEffect(() => {
    void loadLatest(true);
  }, [loadLatest]);

  useEffect(() => {
    void loadRelatedMatch();
  }, [loadRelatedMatch]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const startPolling = () => {
      if (timer === null) timer = setInterval(() => void loadLatest(), 4000);
    };
    if (AppState.currentState === 'active') startPolling();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadLatest();
        startPolling();
      } else {
        stopPolling();
      }
    });
    return () => {
      stopPolling();
      appStateSubscription.remove();
    };
  }, [loadLatest]);

  const loadOlder = async () => {
    if (!accessToken || loadingOlder || pageNumber >= totalPages) return;
    setLoadingOlder(true);
    try {
      const next = await messagesApi.getByConversation(
        conversation.id,
        accessToken,
        { pageNumber: pageNumber + 1, pageSize: 20 }
      );
      mergeMessages(next.items);
      setPageNumber(next.pageNumber);
      setTotalPages(next.totalPages);
    } catch (reason) {
      Alert.alert('No se pudieron cargar más mensajes', messageFor(reason));
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (retry?: VisibleMessage) => {
    if (!accessToken || readOnly || closed || sending) return;
    const content = (retry?.content ?? text).trim();
    if (!content || content.length > 2000) return;
    const localId = retry?.localId ?? `local-${Date.now()}`;
    const tempId = retry?.id ?? -Date.now();
    const optimistic: VisibleMessage = {
      id: tempId,
      localId,
      conversationId: conversation.id,
      senderId: userId ?? 0,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
      delivery: 'pending',
    };
    setMessages((current) => retry
      ? current.map((item) => item.localId === retry.localId ? optimistic : item)
      : [optimistic, ...current]
    );
    if (!retry) setText('');
    setSending(true);
    try {
      const response = await messagesApi.send(
        conversation.id,
        { content },
        accessToken
      );
      setMessages((current) => current.map((item) =>
        item.localId === localId
          ? {
              ...item,
              id: response.id ?? item.id,
              delivery: undefined,
              localId: response.id === null ? localId : `server-${response.id}`,
            }
          : item
      ));
      void loadLatest();
    } catch (reason) {
      setMessages((current) => current.map((item) =>
        item.localId === localId ? { ...item, delivery: 'failed' } : item
      ));
      Alert.alert('No se pudo enviar el mensaje', messageFor(reason));
    } finally {
      setSending(false);
    }
  };

  const confirmReturn = () => {
    if (!accessToken || readOnly || closed || confirming) return;
    Alert.alert(
      'Confirmar devolución',
      'Esta acción no se puede deshacer. ¿Confirmas que el objeto ya fue devuelto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            void (async () => {
              setConfirming(true);
              try {
                await conversationsApi.confirmReturn(conversation.id, accessToken);
                await loadLatest();
                if (conversation.matchId !== null) await loadRelatedMatch();
              } catch (reason) {
                Alert.alert('No se pudo confirmar', messageFor(reason));
              } finally {
                setConfirming(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <View className="flex-1 px-4 pt-16">
        <View className="mb-3 flex-row items-center">
          <TouchableOpacity onPress={onBack} className="mr-3 py-2" accessibilityRole="button">
            <Text className="font-semibold text-blue-600">‹ Chats</Text>
          </TouchableOpacity>
          {conversation.foundItem.photoUrl && (
            <Image source={{ uri: conversation.foundItem.photoUrl }} className="mr-3 h-10 w-10 rounded-lg" />
          )}
          <View className="flex-1">
            <Text className="text-lg font-bold text-blue-900" numberOfLines={1}>
              {conversation.foundItem.article}
            </Text>
            <View>
              <Text className="text-xs text-gray-500">
                {readOnly
                  ? `${conversation.requesterConfirmedReturn ? 'Quien lo busca ya confirmó' : 'Quien lo busca aún no confirma'} · ${conversation.finderConfirmedReturn ? 'Quien lo encontró ya confirmó' : 'Quien lo encontró aún no confirma'}`
                  : `${myConfirmed ? 'Tú ya confirmaste' : 'Tú aún no confirmas'} · ${otherConfirmed ? 'La otra persona ya confirmó' : 'La otra persona aún no confirma'}`}
              </Text>
              <Text className="text-xs text-gray-500">
                Origen: {conversation.matchId !== null ? 'Por coincidencia' : 'Por solicitud'}
              </Text>
              {conversation.matchId !== null && relatedMatch && (
                <TouchableOpacity
                  onPress={() => {
                    if (conversation.matchId !== null) onOpenMatch(conversation.matchId);
                  }}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-semibold text-blue-700">
                    Coincidencia {Math.round(relatedMatch.matchPercentage)}% · Ver match
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {!readOnly && !closed && (
            <TouchableOpacity
              className="ml-2 rounded-lg border border-blue-200 px-3 py-2"
              onPress={confirmReturn}
              disabled={confirming || myConfirmed}
              accessibilityRole="button"
            >
              <Text className="text-xs font-semibold text-blue-700">
                {confirming ? '...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {closed && (
          <View className="mb-3 rounded-lg bg-green-100 p-3">
            <Text className="text-center font-bold text-green-800">Objeto devuelto</Text>
          </View>
        )}
        {loading ? (
          <ActivityIndicator className="my-8" size="large" color="#2563eb" />
        ) : error && messages.length === 0 ? (
          <RetryMessage message={error} onRetry={() => void loadLatest(true)} />
        ) : (
          <View className="flex-1">
            {error && (
              <View className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <Text className="mb-2 text-red-700">{error}</Text>
                <TouchableOpacity onPress={() => void loadLatest()} accessibilityRole="button">
                  <Text className="font-bold text-blue-700">Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              className="flex-1"
              inverted
              data={messages}
              keyExtractor={(item) => item.localId}
              alwaysBounceVertical
              onEndReached={() => void loadOlder()}
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    void loadLatest();
                  }}
                />
              }
              ListFooterComponent={loadingOlder ? <ActivityIndicator className="py-3" /> : null}
              renderItem={({ item }) => {
                const mine = item.senderId === userId;
                return (
                  <View className={`mb-2 max-w-[82%] rounded-2xl p-3 ${
                    mine ? 'self-end bg-blue-600' : 'self-start border border-gray-200 bg-white'
                  }`}>
                    <Text className={mine ? 'text-white' : 'text-gray-900'}>{item.content}</Text>
                    <View className="mt-1 flex-row items-center justify-end gap-2">
                      <Text className={`text-xs ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatTime(item.createdAt)}
                      </Text>
                      {mine && item.readAt && (
                        <Text className="text-xs text-blue-100">Visto</Text>
                      )}
                      {item.delivery === 'pending' && (
                        <Text className="text-xs text-blue-100">Enviando…</Text>
                      )}
                      {item.delivery === 'failed' && (
                        <TouchableOpacity onPress={() => void sendMessage(item)}>
                          <Text className="text-xs font-bold text-red-200">Reintentar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}
        {readOnly ? (
          <Text className="py-3 text-center text-gray-500">Modo de solo lectura</Text>
        ) : closed ? (
          <Text className="py-3 text-center text-gray-500">Esta conversación está cerrada</Text>
        ) : (
          <View className="flex-row items-end gap-2 border-t border-gray-200 bg-gray-50 py-3">
            <TextInput
              className="max-h-28 flex-1 rounded-lg border border-gray-300 bg-white p-3 text-base"
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje"
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              className={`rounded-lg px-4 py-3 ${canSend ? 'bg-blue-600' : 'bg-blue-400'}`}
              onPress={() => void sendMessage()}
              disabled={!canSend}
              accessibilityRole="button"
            >
              <Text className="font-bold text-white">{sending ? '...' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

interface ContactRequestsListProps {
  onBack: () => void;
  onOpenConversation: (requestId: number) => void;
}

const ContactRequestsList: React.FC<ContactRequestsListProps> = ({
  onBack,
  onOpenConversation,
}) => {
  const { accessToken, currentUser } = useAuth();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const userId = numericUserId(currentUser?.id);
  const readOnly = currentUser?.role !== 'USER';
  const privileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  const load = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setRequests(await contactRequestsApi.getAll(accessToken));
      setPageNumber(1);
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

  const received = privileged
    ? requests
    : requests.filter((item) => userId !== null && item.foundItem.userId === userId);
  const sent = privileged
    ? []
    : requests.filter((item) => userId !== null && item.requesterId === userId);
  const visible = activeTab === 'received' ? received : sent;
  const visiblePageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const visibleItems = visible.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);

  const performAction = async (
    item: ContactRequest,
    action: 'accept' | 'reject' | 'cancel'
  ) => {
    if (!accessToken || workingId !== null || readOnly) return;
    setWorkingId(item.id);
    try {
      await contactRequestsApi[action](item.id, accessToken);
      await load();
      if (action === 'accept') onOpenConversation(item.id);
    } catch (reason) {
      Alert.alert('No se pudo actualizar la solicitud', messageFor(reason));
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <View className="flex-1 px-4 pt-4 mt-10">
      <PageHeader title="Solicitudes de contacto" onBack={onBack} />
      <View className="mb-3 flex-row rounded-lg bg-blue-100 p-1">
        <TabButton label="Recibidas" selected={activeTab === 'received'} onPress={() => {
          setActiveTab('received');
          setPageNumber(1);
        }} />
        <TabButton label="Enviadas" selected={activeTab === 'sent'} onPress={() => {
          setActiveTab('sent');
          setPageNumber(1);
        }} />
      </View>
      {loading ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={error ? [] : visibleItems}
          keyExtractor={(item) => String(item.id)}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
          }
          ListFooterComponent={
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={visiblePageCount}
              onPageChange={setPageNumber}
              disabled={refreshing}
            />
          }
          ListHeaderComponent={
            error ? <RetryMessage message={error} onRetry={() => void load()} /> : null
          }
          ListEmptyComponent={
            error ? null : (
              <StateMessage
                message={`No tienes solicitudes ${
                  activeTab === 'received' ? 'recibidas' : 'enviadas'
                }.`}
              />
            )
          }
          renderItem={({ item }) => {
            const pending = item.status === 'Pendiente';
            return (
              <View className="mb-3 rounded-xl border border-gray-200 bg-white p-4">
                <Text className="font-bold text-gray-900">{item.foundItem.article}</Text>
                <Text className="my-1 text-sm text-gray-500">
                  {activeTab === 'received' ? `Solicitante #${item.requesterId}` : 'Tu solicitud'}
                  {' · '}{formatDate(item.createdAt)}
                </Text>
                <Text className="mb-3 text-sm text-gray-600">{item.status}</Text>
                {!readOnly && pending && (
                  <View className="flex-row gap-3">
                    {activeTab === 'received' ? (
                      <>
                        <PrimaryAction
                          label={workingId === item.id ? '...' : 'Aceptar'}
                          onPress={() => void performAction(item, 'accept')}
                          disabled={workingId !== null}
                        />
                        <SecondaryAction
                          label="Rechazar"
                          onPress={() => void performAction(item, 'reject')}
                          disabled={workingId !== null}
                        />
                      </>
                    ) : (
                      <SecondaryAction
                        label={workingId === item.id ? '...' : 'Cancelar solicitud'}
                        onPress={() => void performAction(item, 'cancel')}
                        disabled={workingId !== null}
                      />
                    )}
                  </View>
                )}
                {item.status === 'Aceptada' && (
                  <PrimaryAction label="Ir al chat" onPress={() => onOpenConversation(item.id)} />
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

interface NotificationsListProps {
  onBack: () => void;
  onOpen: (notification: AppNotification) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ onBack, onOpen }) => {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (requestedPage = 1, refresh = false) => {
    if (!accessToken) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await notificationsApi.getAll(accessToken, requestedPage, PAGE_SIZE);
      setNotifications(result.items);
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

  const markAllRead = async () => {
    if (!accessToken) return;
    try {
      await notificationsApi.markAllAsRead(accessToken);
      await load(pageNumber);
    } catch (reason) {
      Alert.alert('No se pudieron marcar como leídas', messageFor(reason));
    }
  };

  return (
    <View className="flex-1 px-4 pt-4 mt-10">
      <PageHeader title="Notificaciones" onBack={onBack} />
      <TouchableOpacity className="mb-3 self-end" onPress={() => void markAllRead()}>
        <Text className="font-semibold text-blue-600">Marcar todas como leídas</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : (
        <FlatList
          data={error ? [] : notifications}
          keyExtractor={(item) => String(item.id)}
          alwaysBounceVertical
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(pageNumber, true)}
            />
          }
          ListFooterComponent={
            <PaginationControls
              pageNumber={pageNumber}
              totalPages={totalPages}
              onPageChange={(page) => void load(page)}
              disabled={loading || refreshing}
            />
          }
          ListHeaderComponent={
            error ? (
              <RetryMessage message={error} onRetry={() => void load(pageNumber)} />
            ) : null
          }
          ListEmptyComponent={error ? null : <StateMessage message="No tienes notificaciones." />}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mb-3 rounded-xl border border-gray-200 p-4 ${
                item.isRead ? 'bg-white' : 'bg-blue-50'
              }`}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
            >
              <Text className="font-bold text-gray-900">{item.title}</Text>
              <Text className="my-1 text-gray-600">{item.message}</Text>
              <Text className="text-xs text-gray-500">{formatDate(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const PageHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View className="mb-4 flex-row items-center">
    <TouchableOpacity className="mr-3 py-2" onPress={onBack} accessibilityRole="button">
      <Text className="font-semibold text-blue-600">‹ Atrás</Text>
    </TouchableOpacity>
    <Text className="flex-1 text-2xl font-bold text-blue-900">{title}</Text>
  </View>
);

const ActionChip: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity className="rounded-full border border-blue-200 bg-white px-3 py-2" onPress={onPress}>
    <Text className="font-semibold text-blue-700">{label}</Text>
  </TouchableOpacity>
);

const TabButton: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    className={`flex-1 items-center rounded-md py-2 ${selected ? 'bg-blue-600' : ''}`}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text className={`font-semibold ${selected ? 'text-white' : 'text-blue-700'}`}>{label}</Text>
  </TouchableOpacity>
);

const PrimaryAction: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <TouchableOpacity
    className={`flex-1 items-center rounded-lg px-4 py-3 ${disabled ? 'bg-blue-400' : 'bg-blue-600'}`}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
  >
    <Text className="font-bold text-white">{label}</Text>
  </TouchableOpacity>
);

const SecondaryAction: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled = false }) => (
  <TouchableOpacity
    className={`flex-1 items-center rounded-lg border border-blue-200 px-4 py-3 ${disabled ? 'opacity-50' : ''}`}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
  >
    <Text className="font-semibold text-blue-700">{label}</Text>
  </TouchableOpacity>
);

const RetryMessage: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
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

function numericUserId(id: string | undefined): number | null {
  if (id === undefined) return null;
  const parsed = Number(id);
  return Number.isInteger(parsed) ? parsed : null;
}

async function resolveConversationByMatchId(
  matchId: number,
  accessToken: string
): Promise<Conversation | null> {
  const conversations = await conversationsApi.getAll(accessToken);
  return conversations.find((conversation) => conversation.matchId === matchId) ?? null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString();
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Inténtalo de nuevo.';
}

function showError(error: unknown): void {
  Alert.alert('No se pudo completar la operación', messageFor(error));
}
