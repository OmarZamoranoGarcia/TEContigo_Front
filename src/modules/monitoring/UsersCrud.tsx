import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../AuthContext';
import {
  usersApi,
  type ManagedUser,
  type ManagedUserFields,
  type ManagedUserRole,
} from '../../api/users/usersApi';
import { PaginationControls } from '../../components/PaginationControls';

const PAGE_SIZE = 20;
const USER_ROLES: ManagedUserRole[] = ['USER', 'EDITOR', 'MODERATOR', 'ADMIN'];

export const UsersCrud: React.FC = () => {
  const { accessToken, currentUser } = useAuth();
  const canManageUsers =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBeingEdited, setUserBeingEdited] = useState<ManagedUser | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<ManagedUser[] | null>(null);
  const [appliedSearchText, setAppliedSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPageNumber, setSearchPageNumber] = useState(1);
  const [searchRevision, setSearchRevision] = useState(0);
  const searchRequestId = useRef(0);

  const loadUsers = useCallback(async (page = 1, refresh = false) => {
    if (!accessToken) {
      setUsers([]);
      setIsLoading(false);
      setIsRefreshing(false);
      setError('Inicia sesión para administrar usuarios.');
      return;
    }

    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const result = await usersApi.list(accessToken, page, PAGE_SIZE);
      setUsers(result.items);
      setPageNumber(result.pageNumber);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los usuarios.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (canManageUsers) void loadUsers();
  }, [canManageUsers, loadUsers]);

  useEffect(() => {
    const query = searchText.trim().toLocaleLowerCase();
    const requestId = ++searchRequestId.current;

    if (!query) {
      setSearchResults(null);
      setAppliedSearchText('');
      setSearchError(null);
      setIsSearching(false);
      setSearchPageNumber(1);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!accessToken) {
        setSearchError('Inicia sesión para buscar usuarios.');
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      void usersApi.listAll(accessToken).then((allUsers) => {
        if (requestId !== searchRequestId.current) return;
        setSearchResults(
          allUsers.filter((user) =>
            String(user.controlNumber).toLocaleLowerCase().includes(query) ||
            user.email.toLocaleLowerCase().includes(query)
          )
        );
        setAppliedSearchText(query);
        setSearchPageNumber(1);
      }).catch((searchFailure: unknown) => {
        if (requestId !== searchRequestId.current) return;
        setSearchResults([]);
        setAppliedSearchText(query);
        setSearchError(
          searchFailure instanceof Error
            ? searchFailure.message
            : 'No se pudieron buscar los usuarios.'
        );
      }).finally(() => {
        if (requestId === searchRequestId.current) setIsSearching(false);
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [accessToken, searchText, searchRevision]);

  if (!canManageUsers) {
    return (
      <View className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
        <Text className="font-semibold text-red-700 dark:text-red-400">
          No tienes permiso para administrar usuarios.
        </Text>
      </View>
    );
  }

  const normalizedSearch = searchText.trim().toLocaleLowerCase();
  const hasSearch = normalizedSearch.length > 0;
  const showingSearchResults =
    hasSearch &&
    appliedSearchText === normalizedSearch &&
    searchResults !== null;
  const displayedPageNumber = showingSearchResults ? searchPageNumber : pageNumber;
  const displayedTotalPages = showingSearchResults
    ? Math.max(1, Math.ceil(searchResults.length / PAGE_SIZE))
    : totalPages;
  const displayedTotalCount = showingSearchResults ? searchResults.length : totalCount;
  const displayedUsers = showingSearchResults
    ? searchResults.slice(
        (searchPageNumber - 1) * PAGE_SIZE,
        searchPageNumber * PAGE_SIZE
      )
    : hasSearch
      ? []
      : users;

  const openCreateForm = () => {
    setUserBeingEdited(null);
    setIsFormVisible(true);
  };

  const openEditForm = (user: ManagedUser) => {
    setUserBeingEdited(user);
    setIsFormVisible(true);
  };

  const saveUser = async (fields: ManagedUserFields, password?: string) => {
    if (!accessToken) {
      Alert.alert('No se pudo guardar', 'Inicia sesión para administrar usuarios.');
      return;
    }

    try {
      if (userBeingEdited) {
        await usersApi.update(userBeingEdited.id, fields, accessToken);
        await loadUsers(pageNumber);
      } else {
        if (!password) {
          throw new Error('La contraseña es obligatoria para crear un usuario.');
        }
        await usersApi.create(
          { ...fields, password },
          accessToken
        );
        await loadUsers(1);
      }
      setIsFormVisible(false);
      setUserBeingEdited(null);
      if (searchText.trim()) {
        setSearchResults(null);
        setAppliedSearchText('');
        setSearchRevision((revision) => revision + 1);
      }
    } catch (saveError) {
      Alert.alert(
        'No se pudo guardar el usuario',
        saveError instanceof Error ? saveError.message : 'Inténtalo de nuevo.'
      );
    }
  };

  const confirmDelete = (user: ManagedUser) => {
    Alert.alert(
      'Eliminar usuario',
      `¿Deseas eliminar a ${user.firstName} ${user.lastNamePaternal}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!accessToken) {
                Alert.alert('No se pudo eliminar', 'Inicia sesión para administrar usuarios.');
                return;
              }
              try {
                await usersApi.delete(user.id, accessToken);
                const nextPage = users.length === 1 && pageNumber > 1
                  ? pageNumber - 1
                  : pageNumber;
                await loadUsers(nextPage);
                if (searchText.trim()) {
                  setSearchResults(null);
                  setAppliedSearchText('');
                  setSearchRevision((revision) => revision + 1);
                }
              } catch (deleteError) {
                Alert.alert(
                  'No se pudo eliminar el usuario',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Inténtalo de nuevo.'
                );
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity
        className="mb-4 self-start rounded-lg bg-blue-600 px-4 py-3"
        onPress={openCreateForm}
        accessibilityRole="button"
      >
        <Text className="font-bold text-white">Crear usuario</Text>
      </TouchableOpacity>

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          {hasSearch && !showingSearchResults
            ? 'Buscando usuarios...'
            : `${displayedTotalCount} ${
                displayedTotalCount === 1 ? 'usuario' : 'usuarios'
              }`}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (hasSearch) {
              setSearchResults(null);
              setAppliedSearchText('');
              setSearchRevision((revision) => revision + 1);
            } else {
              void loadUsers(pageNumber, true);
            }
          }}
          disabled={isLoading || isRefreshing}
          accessibilityRole="button"
        >
          <Text className="font-semibold text-blue-700 dark:text-blue-400">
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        className="mb-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-base text-gray-900 dark:text-white"
        placeholder="Buscar por número de control o correo"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={searchText}
        onChangeText={setSearchText}
        accessibilityLabel="Buscar por número de control o correo electrónico"
      />

      {hasSearch && (isSearching || !showingSearchResults) && !searchError ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : searchError ? (
        <View className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
          <Text className="mb-3 text-red-700 dark:text-red-400">{searchError}</Text>
          <TouchableOpacity
            onPress={() => {
              setSearchError(null);
              setSearchRevision((revision) => revision + 1);
            }}
            accessibilityRole="button"
          >
            <Text className="font-bold text-blue-700 dark:text-blue-400">Reintentar búsqueda</Text>
          </TouchableOpacity>
        </View>
      ) : hasSearch && !showingSearchResults ? null : hasSearch && displayedUsers.length === 0 ? (
        <Text className="py-8 text-center text-gray-500 dark:text-gray-400">
          No se encontraron usuarios con ese número de control o correo.
        </Text>
      ) : null}

      {!hasSearch && isLoading && users.length === 0 ? (
        <ActivityIndicator className="my-8" size="large" color="#2563eb" />
      ) : !hasSearch && error && users.length === 0 ? (
        <View className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
          <Text className="mb-3 text-red-700 dark:text-red-400">{error}</Text>
          <TouchableOpacity onPress={() => void loadUsers(pageNumber)} accessibilityRole="button">
            <Text className="font-bold text-blue-700 dark:text-blue-400">Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !hasSearch && users.length === 0 ? (
        <Text className="py-8 text-center text-gray-500 dark:text-gray-400">
          Todavía no hay usuarios.
        </Text>
      ) : (
        <>
          {!hasSearch && error && (
            <View className="mb-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
              <Text className="text-red-700 dark:text-red-400">{error}</Text>
            </View>
          )}
          {displayedUsers.map((user) => (
            <View
              key={String(user.id)}
              className="mb-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
            >
              <View className="mb-3 flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900 dark:text-white">
                    {user.firstName} {user.lastNamePaternal} {user.lastNameMaternal}
                  </Text>
                  <Text className="mt-1 text-gray-600 dark:text-gray-300">{user.email}</Text>
                </View>
                <Text className="rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                  {user.role}
                </Text>
              </View>
              <Text className="mb-1 text-sm text-gray-600 dark:text-gray-300">
                Número de control: {user.controlNumber}
              </Text>
              {typeof user.emailVerified === 'boolean' && (
                <Text className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                  Correo {user.emailVerified ? 'verificado' : 'sin verificar'}
                </Text>
              )}
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  className="rounded-full border border-blue-200 bg-blue-100 px-4 py-1.5 dark:border-blue-800 dark:bg-blue-500"
                  onPress={() => openEditForm(user)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar a ${user.firstName}`}
                >
                  <Text className="text-sm font-semibold text-blue-700 dark:text-white">Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-full border border-red-200 bg-red-100 px-4 py-1.5 dark:border-red-800 dark:bg-red-500"
                  onPress={() => confirmDelete(user)}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar a ${user.firstName}`}
                >
                  <Text className="text-sm font-semibold text-red-700 dark:text-white">
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <PaginationControls
            pageNumber={displayedPageNumber}
            totalPages={displayedTotalPages}
            onPageChange={(page) => {
              if (showingSearchResults) setSearchPageNumber(page);
              else void loadUsers(page);
            }}
            disabled={isLoading || isRefreshing}
          />
        </>
      )}

      {isFormVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setIsFormVisible(false)}
        >
          <View className="flex-1 justify-center bg-black/40 px-5 py-8">
            <ScrollView
              className="max-h-[90%] rounded-xl bg-white dark:bg-gray-800"
              contentContainerClassName="p-5"
              keyboardShouldPersistTaps="handled"
            >
              <UserForm
                user={userBeingEdited}
                onCancel={() => setIsFormVisible(false)}
                onSubmit={saveUser}
              />
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

interface UserFormProps {
  user: ManagedUser | null;
  onCancel: () => void;
  onSubmit: (fields: ManagedUserFields, password?: string) => Promise<void>;
}

const UserForm: React.FC<UserFormProps> = ({ user, onCancel, onSubmit }) => {
  const [controlNumber, setControlNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastNamePaternal, setLastNamePaternal] = useState('');
  const [lastNameMaternal, setLastNameMaternal] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ManagedUserRole>('USER');
  const [emailVerified, setEmailVerified] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setControlNumber(user ? String(user.controlNumber) : '');
    setFirstName(user?.firstName ?? '');
    setLastNamePaternal(user?.lastNamePaternal ?? '');
    setLastNameMaternal(user?.lastNameMaternal ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setRole(user?.role ?? 'USER');
    setEmailVerified(user?.emailVerified ?? true);
  }, [user]);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const numericControlNumber = Number(controlNumber);

    if (
      !controlNumber.trim() ||
      !Number.isSafeInteger(numericControlNumber) ||
      numericControlNumber <= 0 ||
      !firstName.trim() ||
      !lastNamePaternal.trim() ||
      !lastNameMaternal.trim() ||
      !normalizedEmail ||
      (!user && !password.trim())
    ) {
      Alert.alert(
        'Revisa los datos',
        user
          ? 'Completa todos los campos obligatorios y verifica el número de control.'
          : 'Completa todos los campos obligatorios, incluida la contraseña.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Correo inválido', 'Escribe una dirección de correo válida.');
      return;
    }

    if (!user && password.length < 8) {
      Alert.alert('Contraseña inválida', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const fields: ManagedUserFields = {
      controlNumber: numericControlNumber,
      firstName: firstName.trim(),
      lastNamePaternal: lastNamePaternal.trim(),
      lastNameMaternal: lastNameMaternal.trim(),
      email: normalizedEmail,
      role,
      emailVerified,
    };

    setIsSaving(true);
    try {
      await onSubmit(fields, user ? undefined : password);
    } finally {
      setIsSaving(false);
    }
  };

  const textInputClass =
    'mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-base text-gray-900 dark:text-white';

  return (
    <>
      <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
        {user ? 'Editar usuario' : 'Crear usuario'}
      </Text>
      <TextInput
        className={textInputClass}
        placeholder="Número de control"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        maxLength={15}
        value={controlNumber}
        onChangeText={(value) => setControlNumber(value.replace(/\D/g, ''))}
      />
      <TextInput
        className={textInputClass}
        placeholder="Nombre(s)"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
        maxLength={50}
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        className={textInputClass}
        placeholder="Apellido paterno"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
        maxLength={30}
        value={lastNamePaternal}
        onChangeText={setLastNamePaternal}
      />
      <TextInput
        className={textInputClass}
        placeholder="Apellido materno"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
        maxLength={30}
        value={lastNameMaternal}
        onChangeText={setLastNameMaternal}
      />
      <TextInput
        className={textInputClass}
        placeholder="Correo electrónico"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={100}
        value={email}
        onChangeText={setEmail}
      />
      {!user && (
        <TextInput
          className={textInputClass}
          placeholder="Contraseña (mínimo 8 caracteres)"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
      )}

      <Text className="mb-2 font-semibold text-gray-700 dark:text-gray-300">Rol</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {USER_ROLES.map((option) => (
          <TouchableOpacity
            key={option}
            className={`rounded-lg border px-3 py-2 ${
              role === option
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40'
                : 'border-gray-300 dark:border-gray-700'
            }`}
            onPress={() => setRole(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: role === option }}
          >
            <Text
              className={
                role === option
                  ? 'font-semibold text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300'
              }
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="mb-5 flex-row items-center justify-between">
        <Text className="font-semibold text-gray-700 dark:text-gray-300">Correo verificado</Text>
        <Switch value={emailVerified} onValueChange={setEmailVerified} />
      </View>

      <View className="flex-row justify-end gap-3">
        <TouchableOpacity className="rounded-lg px-4 py-3" onPress={onCancel}>
          <Text className="font-semibold text-gray-600 dark:text-gray-300">Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`rounded-lg px-4 py-3 ${isSaving ? 'bg-blue-400' : 'bg-blue-600'}`}
          onPress={() => void handleSubmit()}
          disabled={isSaving}
          accessibilityRole="button"
        >
          <Text className="font-semibold text-white">
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};
