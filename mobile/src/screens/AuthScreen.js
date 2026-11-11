import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest, setAuthSession, getBaseUrl, setBaseUrl } from '../api/client';

export default function AuthScreen({ onLoginSuccess, lang = 'bn' }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset' | 'server'
  const [email, setEmail] = useState('hasnat.rahman225@gmail.com');
  const [password, setPassword] = useState('036928');
  const [confirmPassword, setConfirmPassword] = useState('036928');
  const [name, setName] = useState('মো. মতিউর রহমান');
  const [businessName, setBusinessName] = useState('মেসার্স ট্রেডার্স');
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getBaseUrl().then(setServerUrl);
  }, [mode]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('ইমেইল ও পাসওয়ার্ড দিন');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (data && data.token && data.user) {
        await setAuthSession(data.token, data.user);
        onLoginSuccess(data.user);
      } else {
        throw new Error('সার্ভার থেকে সঠিক তথ্য পাওয়া যায়নি');
      }
    } catch (err) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError('নাম, ইমেইল এবং পাসওয়ার্ড পূরণ করুন');
      return;
    }
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মেলেনি');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          email: email.trim(),
          password,
        }),
      });
      if (data && data.token && data.user) {
        await setAuthSession(data.token, data.user);
        onLoginSuccess(data.user);
      } else {
        throw new Error('রেজিস্ট্রেশন সম্পন্ন করা যায়নি');
      }
    } catch (err) {
      setError(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !password) {
      setError('ইমেইল এবং নতুন পাসওয়ার্ড দিন');
      return;
    }
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড দুটি মেলেনি');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), newPassword: password }),
      });
      setSuccessMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।');
      setTimeout(() => {
        setMode('login');
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      setError(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async () => {
    if (!serverUrl) return;
    await setBaseUrl(serverUrl.trim());
    Alert.alert('সফল', `সার্ভার ইউআরএল সংরক্ষণ করা হয়েছে: ${serverUrl.trim()}`);
    setMode('login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Day / Night quick toggle */}
        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.colors.surfaceLight,
              borderColor: theme.colors.surfaceBorder,
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 6,
            }}
            onPress={toggleTheme}
          >
            <Text style={{ fontSize: 12, color: theme.colors.text, fontWeight: '700' }}>
              {isDark ? '☀️ দিন' : '🌙 রাত'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>খাতা</Text>
          </View>
          <Text style={styles.brandTitle}>{t.app_title}</Text>
          <Text style={styles.brandTagline}>{t.tagline}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>
            {mode === 'login' && t.login_title}
            {mode === 'signup' && t.signup_title}
            {mode === 'reset' && t.reset_title}
            {mode === 'server' && t.server_config}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {mode === 'server' ? (
            <View>
              <Text style={styles.inputLabel}>{t.current_server}</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://apan-khata.web.app"
                placeholderTextColor={theme.colors.textDim}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>{t.server_help}</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveServer}>
                <Text style={styles.btnPrimaryText}>{t.save_server}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('login')}>
                <Text style={styles.btnSecondaryText}>{t.back_to_login}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {mode === 'signup' && (
                <>
                  <Text style={styles.inputLabel}>{t.your_name} *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="আপনার নাম"
                    placeholderTextColor={theme.colors.textDim}
                  />

                  <Text style={styles.inputLabel}>{t.business_name}</Text>
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="প্রতিষ্ঠানের নাম"
                    placeholderTextColor={theme.colors.textDim}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{t.email} *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>
                {mode === 'reset' ? 'নতুন পাসওয়ার্ড *' : `${t.password} *`}
              </Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textDim}
                secureTextEntry
              />

              {(mode === 'signup' || mode === 'reset') && (
                <>
                  <Text style={styles.inputLabel}>{t.confirm_password} *</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.textDim}
                    secureTextEntry
                  />
                </>
              )}

              {/* Primary Action Button */}
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={
                  mode === 'login'
                    ? handleLogin
                    : mode === 'signup'
                    ? handleSignup
                    : handleResetPassword
                }
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {mode === 'login' && t.btn_login}
                    {mode === 'signup' && t.btn_signup}
                    {mode === 'reset' && t.btn_reset}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Mode switch links */}
              <View style={styles.linkContainer}>
                {mode === 'login' ? (
                  <>
                    <TouchableOpacity onPress={() => setMode('signup')}>
                      <Text style={styles.linkText}>
                        নতুন অ্যাকাউন্ট তৈরি করবেন?{' '}
                        <Text style={styles.linkAccent}>{t.signup_title}</Text>
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMode('reset')}>
                      <Text style={styles.linkAccent}>{t.forgot_password}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => setMode('login')}>
                    <Text style={styles.linkText}>
                      ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                      <Text style={styles.linkAccent}>{t.btn_login}</Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Server Config entrypoint */}
        <TouchableOpacity style={styles.serverFooter} onPress={() => setMode('server')}>
          <Text style={styles.serverFooterText}>⚙️ {t.server_config}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingTop: 40,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.lg,
    marginBottom: 10,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.textDim,
    marginTop: 6,
    lineHeight: 16,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  linkContainer: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  linkAccent: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(225, 29, 72, 0.1)',
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
  },
  successBox: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)',
    borderColor: theme.colors.primary,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  serverFooter: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
  },
  serverFooterText: {
    color: theme.colors.textDim,
    fontSize: 12,
  },
});
