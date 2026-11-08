// src/screens/VerifyEmailScreen.tsx
import React, { useEffect, useState } from 'react';
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
import { authApi } from '../../api/auth/authApi';
import { ApiError } from '../../api/auth/client';

const CODE_LENGTH = 6;

// Evita que el usuario pida códigos en ráfaga. Arranca en 60 porque
// el primer código acaba de enviarse al registrarse.
const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyEmailScreenProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({
  email,
  onVerified,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);

    return () => clearTimeout(timeoutId);
  }, [secondsLeft]);

  const isBusy = isVerifying || isResending;
  const canResend = secondsLeft <= 0 && !isBusy;

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      Alert.alert(
        'Código incompleto',
        `Escribe los ${CODE_LENGTH} dígitos que enviamos a tu correo.`
      );
      return;
    }

    setIsVerifying(true);

    try {
      const response = await authApi.verifyEmail({ email, code });

      Alert.alert(
        'Cuenta verificada',
        response?.message || 'Tu correo quedó verificado. Ya puedes iniciar sesión.',
        [{ text: 'Iniciar sesión', onPress: onVerified }],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert('No se pudo verificar', getErrorMessage(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);

    try {
      const response = await authApi.resendCode({ email });

      setCode('');
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);

      Alert.alert(
        'Código reenviado',
        response?.message || 'Te enviamos un nuevo código a tu correo.'
      );
    } catch (error) {
      Alert.alert('No se pudo reenviar el código', getErrorMessage(error));
    } finally {
      setIsResending(false);
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
          paddingHorizontal: 24,
          paddingVertical: 24,
        }}
      >
        <Text className="title1">
          Verifica tu correo
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center">
          Enviamos un código de {CODE_LENGTH} dígitos a
        </Text>
        <Text className="text-base font-semibold text-gray-700 dark:text-gray-200 text-center">
          {email}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          El código vence en 5 minutos.
        </Text>

        <View className="mb-8">
          <Text className="title3">
            Código de verificación
          </Text>
          <TextInput
            className="bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-4 text-2xl text-center text-gray-900 dark:text-white"
            style={{ letterSpacing: 8 }}
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            textContentType="oneTimeCode"
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            accessibilityLabel="Código de verificación"
          />
        </View>

        <TouchableOpacity
          className={`rounded-lg p-4 flex-row justify-center items-center mb-4 ${
            isBusy ? 'bg-blue-400' : 'bg-blue-600'
          }`}
          onPress={handleVerify}
          disabled={isBusy}
          accessibilityRole="button"
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Verificar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={!canResend}
          className="py-2 mb-2"
          accessibilityRole="button"
        >
          <Text
            className={`text-center font-semibold ${
              canResend ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {isResending
              ? 'Enviando código...'
              : canResend
              ? 'Reenviar código'
              : `Reenviar código en ${secondsLeft} s`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBack}
          disabled={isBusy}
          className="py-2"
          accessibilityRole="button"
        >
          <Text className="text-center text-gray-500 dark:text-gray-400">
            ¿Escribiste mal tu correo? Vuelve al registro
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
