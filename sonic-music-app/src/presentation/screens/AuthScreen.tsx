import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator, 
  Alert,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppDispatch, useAppSelector } from '../../application/store/hooks';
import { loginUser, registerUser } from '../../application/store/slices/authSlice';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';

type AuthMode = 'login' | 'register';

export const AuthScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);
  const colors = useAppSelector(state => state.theme.colors);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      if (mode === 'login') {
        await dispatch(loginUser({ email: email.trim(), password })).unwrap();
      } else {
        await dispatch(registerUser({ email: email.trim(), password, name: name.trim() })).unwrap();
      }
    } catch (err) {
      // Error is handled in the slice
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    dispatch({ type: 'auth/clearError' });
  };

  return (
    <SafeContainer style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.primary }]}>Sonic</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {mode === 'login' ? 'Welcome back!' : 'Create an account'}
            </Text>
          </View>

          <View style={styles.form}>
            {mode === 'register' && (
              <View style={[styles.inputContainer, { backgroundColor: colors.secondary }]}>
                <Feather name="user" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: colors.secondary }]}>
              <Feather name="mail" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.secondary }]}>
              <Feather name="lock" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={[styles.showPassword, { color: colors.primary }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                  <Feather name="arrow-right" size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.secondary }]} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, { backgroundColor: colors.secondary }]}
              onPress={() => {
                Alert.alert('Coming Soon', 'Spotify login will be available soon');
              }}
            >
              <Text style={[styles.socialButtonText, { color: colors.text }]}>
                Continue with Spotify
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  logo: { fontSize: 48, fontWeight: 'bold' },
  subtitle: { fontSize: 18, marginTop: SPACING.sm },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    height: 56,
    marginBottom: SPACING.md,
  },
  input: { flex: 1, marginLeft: SPACING.sm, fontSize: 16 },
  showPassword: { fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ff4444', fontSize: 14, marginBottom: SPACING.md, textAlign: 'center' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: SIZES.radius,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: { color: '#000', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: SPACING.md, fontSize: 14 },
  socialButton: {
    height: 56,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xxl },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600', marginLeft: SPACING.xs },
});

export default AuthScreen;
