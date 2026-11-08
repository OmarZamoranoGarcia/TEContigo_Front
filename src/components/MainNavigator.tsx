import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useColorScheme } from 'nativewind';
import { Feather } from '@expo/vector-icons';
import { reportsApi } from '../api/reports/reportsApi';
import type { Report, ReportFields } from '../api/reports/reportsApi';
import { ReportCard } from '../modules/reports/ReportCard';
import { ReportFormModal } from '../modules/reports/ReportFormModal';
import { ReportStatusModal } from '../modules/reports/ReportStatusModal';
import { useAuth } from '../AuthContext';
import { ObjectsScreen } from '../modules/objects/ObjectsScreen';
import { ChatsScreen } from '../modules/chats/ChatsScreen';
import type { PushNotificationTarget } from '../modules/chats/ChatsScreen';
import { getPushTarget, registerPushDevice } from '../modules/chats/pushNotifications';
import { PaginationControls } from './PaginationControls';
import { UsersCrud } from '../modules/monitoring/UsersCrud';

export const MainNavigator = () => {
  const [activeTab, setActiveTab] = useState('Avisos');
  const { accessToken, currentUser, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isRefreshingReports, setIsRefreshingReports] = useState(false);
  const [reportPageNumber, setReportPageNumber] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [isReportFormVisible, setIsReportFormVisible] = useState(false);
  const [reportBeingEdited, setReportBeingEdited] = useState<Report | null>(null);
  const [reportChangingStatus, setReportChangingStatus] = useState<Report | null>(null);
  const [pushTarget, setPushTarget] = useState<PushNotificationTarget | null>(null);
  const [chatsStartAt, setChatsStartAt] = useState<'home' | 'requests'>('home');
  const objectsRefreshRef = useRef<(() => Promise<void>) | null>(null);

  const tabs = [
    'Avisos',
    'Objetos',
    'Chats',
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR'
      ? ['Usuarios']
      : []),
    'Perfil',
  ];

  const loadReports = useCallback(async (
    pageNumber = 1,
    refresh = false
  ): Promise<Report[] | null> => {
    if (!accessToken) {
      setReports([]);
      setIsLoadingReports(false);
      setIsRefreshingReports(false);
      setReportPageNumber(1);
      setReportTotalPages(1);
      return null;
    }

    if (refresh) {
      setIsRefreshingReports(true);
    } else {
      setIsLoadingReports(true);
    }
    setReportsError(null);
    try {
      const page = await reportsApi.list(accessToken, pageNumber);
      setReports(page.items);
      setReportPageNumber(page.pageNumber);
      setReportTotalPages(page.totalPages);
      return page.items;
    } catch (error) {
      setReportsError(
        error instanceof Error ? error.message : 'No se pudieron cargar los reportes.'
      );
      return null;
    } finally {
      if (refresh) {
        setIsRefreshingReports(false);
      } else {
        setIsLoadingReports(false);
      }
    }
  }, [accessToken]);

  const registerObjectsRefresh = useCallback((refresh: (() => Promise<void>) | null) => {
    objectsRefreshRef.current = refresh;
  }, []);

  const refreshActiveTab = useCallback(async () => {
    if (activeTab === 'Avisos') {
      await loadReports(reportPageNumber, true);
      return;
    }
    if (activeTab === 'Objetos') {
      setIsRefreshingReports(true);
      try {
        await objectsRefreshRef.current?.();
      } finally {
        setIsRefreshingReports(false);
      }
    }
  }, [activeTab, loadReports, reportPageNumber]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!accessToken) return;

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const target = getPushTarget(response);
      if (!target) return;
      setPushTarget(target);
      setActiveTab('Chats');
    };

    void registerPushDevice(accessToken).catch((error: unknown) => {
      Alert.alert(
        'No se pudo registrar el dispositivo',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      );
    });

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) handleResponse(initialResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [accessToken]);

  const showRequestError = (error: unknown) => {
    Alert.alert(
      'No se pudo completar la operación',
      error instanceof Error ? error.message : 'Inténtalo de nuevo.'
    );
  };

  const handleSaveReport = async (fields: ReportFields) => {
    if (!accessToken) {
      showRequestError(new Error('Inicia sesión para administrar reportes.'));
      return;
    }

    try {
      if (reportBeingEdited) {
        await reportsApi.update(reportBeingEdited.id, fields, accessToken);
        const updatedReports = await loadReports(reportPageNumber);
        const updatedReport = updatedReports?.find(
          (report) => String(report.id) === String(reportBeingEdited.id)
        );
        if (
          !updatedReport ||
          updatedReport.name !== fields.name ||
          updatedReport.category !== fields.category ||
          updatedReport.description !== fields.description
        ) {
          throw new Error(
            'El servidor aceptó la edición, pero al volver a consultar el reporte siguen apareciendo los datos anteriores. No se confirmó que los cambios se guardaran.'
          );
        }
      } else {
        await reportsApi.create(fields, accessToken);
        await loadReports(1);
      }
      setIsReportFormVisible(false);
      setReportBeingEdited(null);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleDeleteReport = (report: Report) => {
    Alert.alert('Eliminar reporte', `¿Deseas eliminar "${report.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!accessToken) {
              showRequestError(new Error('Inicia sesión para administrar reportes.'));
              return;
            }
            try {
              await reportsApi.delete(report.id, accessToken);
              await loadReports();
            } catch (error) {
              showRequestError(error);
            }
          })();
        },
      },
    ]);
  };

  const handleChangeStatus = async (status: string) => {
    if (!reportChangingStatus) return;
    if (!accessToken) {
      showRequestError(new Error('Inicia sesión para administrar reportes.'));
      return;
    }
    try {
      await reportsApi.update(
        reportChangingStatus.id,
        {
          name: reportChangingStatus.name,
          category: reportChangingStatus.category,
          description: reportChangingStatus.description,
          status,
        },
        accessToken
      );
      const updatedReports = await loadReports(reportPageNumber);
      const updatedReport = updatedReports?.find(
        (report) => String(report.id) === String(reportChangingStatus.id)
      );
      if (
        !updatedReport ||
        normalizeReportStatus(updatedReport.status) !== normalizeReportStatus(status)
      ) {
        throw new Error(
          'El servidor aceptó el cambio de estado, pero al volver a consultar el reporte sigue teniendo el estado anterior. No se confirmó que el cambio se guardara.'
        );
      }
      setReportChangingStatus(null);
    } catch (error) {
      showRequestError(error);
    }
  };

  const openCreateForm = () => {
    setReportBeingEdited(null);
    setIsReportFormVisible(true);
  };

  const openEditForm = (report: Report) => {
    setReportBeingEdited(report);
    setIsReportFormVisible(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo cerrar la sesión en el servidor.';
      Alert.alert('Sesión cerrada localmente', message);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {activeTab === 'Chats' ? (
        <ChatsScreen pushTarget={pushTarget} startAt={chatsStartAt} />
      ) : (
        <ScrollView
          className="flex-1"
          alwaysBounceVertical
          refreshControl={
            activeTab === 'Avisos' || activeTab === 'Objetos' ? (
              <RefreshControl
                refreshing={isRefreshingReports}
                onRefresh={() => void refreshActiveTab()}
              />
            ) : undefined
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 60, // <--- Esta es la clave para esquivar la Dynamic Island/Notch
            paddingBottom: 40,
          }}
        >
          <Text className="mb-6 mt-3 title1">{activeTab}</Text>

          {/* Pestaña: AVISOS */}
          {activeTab === 'Avisos' && (
            <View>
              <TouchableOpacity
                className="mb-5 self-start rounded-lg bg-blue-600 px-4 py-3"
                onPress={openCreateForm}
                accessibilityRole="button"
              >
                <Text className="font-bold text-white">Crear reporte</Text>
              </TouchableOpacity>

              {isLoadingReports && reports.length === 0 ? (
                <ActivityIndicator className="my-8" size="large" color="#2563eb" />
              ) : reportsError && reports.length === 0 ? (
                <View className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
                  <Text className="mb-3 text-red-700 dark:text-red-400">{reportsError}</Text>
                  <TouchableOpacity onPress={() => void loadReports()} accessibilityRole="button">
                    <Text className="font-bold text-blue-700 dark:text-blue-400">Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : reports.length === 0 ? (
                <Text className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Todavía no hay reportes publicados.
                </Text>
              ) : (
                <>
                  {reportsError && (
                    <View className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
                      <Text className="mb-3 text-red-700 dark:text-red-400">{reportsError}</Text>
                      <TouchableOpacity
                        onPress={() => void loadReports(reportPageNumber, true)}
                        disabled={isRefreshingReports}
                        accessibilityRole="button"
                      >
                        <Text className="font-bold text-blue-700 dark:text-blue-400">
                          {isRefreshingReports ? 'Actualizando...' : 'Reintentar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {reports.map((report) => (
                    <ReportCard
                      key={String(report.id)}
                      report={report}
                      onEdit={openEditForm}
                      onDelete={handleDeleteReport}
                      onChangeStatus={setReportChangingStatus}
                    />
                  ))}
                  <PaginationControls
                    pageNumber={reportPageNumber}
                    totalPages={reportTotalPages}
                    onPageChange={(page) => void loadReports(page)}
                    disabled={isLoadingReports || isRefreshingReports}
                  />
                </>
              )}
            </View>
          )}

          {/* Pestaña: OBJETOS */}
          {activeTab === 'Objetos' && (
            <ObjectsScreen
              onOpenRequests={() => {
                setChatsStartAt('requests');
                setActiveTab('Chats');
              }}
              onRefreshReady={registerObjectsRefresh}
            />
          )}

          {activeTab === 'Usuarios' && <UsersCrud />}

          {/* Pestaña: PERFIL */}
          {activeTab === 'Perfil' && (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm items-center">
              {/* Avatar genérico */}
              <View className="w-24 h-24 bg-blue-600 rounded-full items-center justify-center mb-4 mt-2">
                <Text className="text-white text-3xl font-bold">
                  {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>

              {/* Información del usuario conectada al Context API */}
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {currentUser?.email}
              </Text>
              <Text className="text-blue-600 dark:text-blue-400 font-semibold mb-6">
                Rol de cuenta: {currentUser?.role}
              </Text>

              {/* Botón de Modo Oscuro */}
              <TouchableOpacity
                className="flex-row items-center justify-between gap-2 bg-gray-200 dark:bg-black rounded-full px-2 py-2 w-1/2 mb-8 border border-gray-300 dark:border-gray-800"
                onPress={toggleColorScheme}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                {colorScheme === 'dark' ? (
                  <>
                    <View className="bg-white rounded-full p-2">
                      <Feather name="moon" size={20} color="black" />
                    </View>
                    <Text className="text-white font-bold text-sm flex-1 text-center pr-2">
                      NIGHT MODE
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-black font-bold text-sm flex-1 text-center pl-2">
                      DAY MODE
                    </Text>
                    <View className="bg-white rounded-full p-2 shadow-sm border-gray-300">
                      <Feather name="sun" size={20} color="black" />
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 py-3 px-8 rounded-lg w-full items-center"
                onPress={handleLogout}
                accessibilityRole="button"
              >
                <Text className="text-red-600 dark:text-red-400 font-bold text-base">
                  Cerrar Sesión
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Espaciado al final para que el último elemento no quede detrás de la barra inferior */}
          <View className="h-10" />
        </ScrollView>
      )}

      {/* Barra de navegación inferior */}
      <View className="flex-row bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-600 pb-5 pt-3">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            className="flex-1 items-center justify-center"
            onPress={() => {
              if (tab === 'Chats' && activeTab !== 'Chats') {
                setChatsStartAt('home');
              }
              if (tab === 'Avisos' && activeTab !== 'Avisos') {
                void loadReports(reportPageNumber, true);
              }
              setActiveTab(tab);
            }}
            accessibilityRole="button"
          >
            <View
              className={`w-6 h-6 mb-1 rounded-full ${
                activeTab === tab ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <Text
              className={`text-xs ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ReportFormModal
        visible={isReportFormVisible}
        report={reportBeingEdited}
        onCancel={() => {
          setIsReportFormVisible(false);
          setReportBeingEdited(null);
        }}
        onSubmit={handleSaveReport}
      />
      <ReportStatusModal
        visible={reportChangingStatus !== null}
        currentStatus={reportChangingStatus?.status ?? null}
        onCancel={() => setReportChangingStatus(null)}
        onSelect={(status) => void handleChangeStatus(status)}
      />
    </View>
  );
};

function normalizeReportStatus(status: string): string {
  return status
    .trim()
    .toLocaleUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]/g, '_');
}
