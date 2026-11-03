// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../../AuthContext';
import { authApi } from '../../api/auth/authApi';
import { ApiError } from '../../api/auth/client';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  useColorScheme();

  const handleLogin = async () => {
    // Aquí no se valida el dominio institucional a propósito: la cuenta de
    // administrador sembrada en la BD podría no usarlo y quedaría bloqueada.
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Revisa tus datos', 'Escribe tu correo y tu contraseña para continuar.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await authApi.login({ email: normalizedEmail, password });
      login(session, normalizedEmail);
      // Si sale bien, AuthContext cambia el estado y la app reemplaza esta
      // pantalla; no hace falta navegar desde aquí.
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

      Alert.alert('No se pudo iniciar sesión', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 24,
        }}
      >
        <View className="w-full max-w-md">
          <Text className="title1">
            Avisos TEC
          </Text>
          <Text className="title2">
            Inicia sesión con tu correo institucional
          </Text>

          <View className="mb-4">
            <Text className="title3">
              Correo Electrónico
            </Text>
            <TextInput
              className="bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-4 text-base text-gray-900 dark:text-white"
              placeholder="ejemplo@tectijuana.edu.mx"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              maxLength={100}
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Entrada de correo electrónico"
            />
          </View>

          <View className="mb-6">
            <Text className="title3">
              Contraseña
            </Text>
            <TextInput
              className="bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-4 text-base text-gray-900 dark:text-white"
              placeholder="********"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="Entrada de contraseña"
            />
          </View>

          <TouchableOpacity
            className={`rounded-lg p-4 flex-row justify-center items-center mb-4 ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Ingresar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToRegister}
            className="py-2"
            accessibilityRole="button"
          >
            <Text className="title4">
              ¿No tienes cuenta? Regístrate aquí
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
