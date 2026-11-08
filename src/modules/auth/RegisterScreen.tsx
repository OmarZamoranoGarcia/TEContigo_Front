// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { authApi } from '../../api/auth/authApi';
import { ApiError } from '../../api/auth/client';

const INSTITUTIONAL_DOMAIN = '@tectijuana.edu.mx';

// Solo validación de la app: el backend hoy solo exige que no esté vacía.
const MIN_PASSWORD_LENGTH = 8;

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  /** Se llama tras registrarse: el backend envió un código al correo y hay que verificarlo. */
  onRegistered: (email: string) => void;
}

interface FormFieldProps extends TextInputProps {
  label: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, ...inputProps }) => (
  <View className="mb-4">
    <Text className="title3">{label}</Text>
    <TextInput
      className="bg-white border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg p-4 text-base text-gray-900 dark:text-white"
      placeholderTextColor="#9CA3AF"
      accessibilityLabel={label}
      {...inputProps}
    />
  </View>
);

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onRegistered,
}) => {
  const [controlNumber, setControlNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastNamePaternal, setLastNamePaternal] = useState('');
  const [lastNameMaternal, setLastNameMaternal] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): string | null => {
    if (
      !Number(controlNumber) ||
      !firstName.trim() ||
      !lastNamePaternal.trim() ||
      !lastNameMaternal.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      return 'Completa todos los campos para continuar.';
    }

    if (!email.trim().toLowerCase().endsWith(INSTITUTIONAL_DOMAIN)) {
      return `Usa tu correo institucional, que termina en ${INSTITUTIONAL_DOMAIN}.`;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden. Escríbelas de nuevo.';
    }

    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();

    if (validationError) {
      Alert.alert('Revisa tus datos', validationError);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setIsLoading(true);

    try {
      const response = await authApi.register({
        controlNumber: Number(controlNumber),
        firstName: firstName.trim(),
        lastNamePaternal: lastNamePaternal.trim(),
        lastNameMaternal: lastNameMaternal.trim(),
        email: normalizedEmail,
        password,
      });

      // cancelable: false evita que en Android se cierre la alerta tocando
      // fuera y el usuario se quede en el registro sin pasar a verificar.
      Alert.alert(
        'Revisa tu correo',
        response.message,
        [{ text: 'Ingresar código', onPress: () => onRegistered(normalizedEmail) }],
        { cancelable: false }
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.';

      Alert.alert('No se pudo crear la cuenta', message);
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
          paddingHorizontal: 24,
          paddingVertical: 24,
        }}
      >
        <Text className="mt-4 title1">
          Crear Cuenta
        </Text>
        <Text className="title2">
          Únete a Avisos TEC
        </Text>

        <FormField
          label="Número de control"
          placeholder="Ej. 21210123"
          keyboardType="number-pad"
          maxLength={15}
          value={controlNumber}
          onChangeText={(text) => setControlNumber(text.replace(/\D/g, ''))}
        />

        <FormField
          label="Nombre(s)"
          placeholder="Ej. Juan Carlos"
          autoCapitalize="words"
          maxLength={50}
          value={firstName}
          onChangeText={setFirstName}
        />

        <FormField
          label="Apellido paterno"
          placeholder="Ej. Pérez"
          autoCapitalize="words"
          maxLength={30}
          value={lastNamePaternal}
          onChangeText={setLastNamePaternal}
        />

        <FormField
          label="Apellido materno"
          placeholder="Ej. López"
          autoCapitalize="words"
          maxLength={30}
          value={lastNameMaternal}
          onChangeText={setLastNameMaternal}
        />

        <FormField
          label="Correo institucional"
          placeholder={`ejemplo${INSTITUTIONAL_DOMAIN}`}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          value={email}
          onChangeText={setEmail}
        />

        <FormField
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        <View className="mb-4">
          <FormField
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            secureTextEntry
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          className={`rounded-lg p-4 flex-row justify-center items-center mb-4 ${
            isLoading ? 'bg-blue-400' : 'bg-blue-600'
          }`}
          onPress={handleRegister}
          disabled={isLoading}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Registrarse</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNavigateToLogin}
          className="py-2"
          accessibilityRole="button"
        >
          <Text className="title4">
            ¿Ya tienes cuenta? Inicia sesión aquí
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
