import React, { useState, useEffect } from 'react';
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
import { THEME } from '../constants/theme';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest, setAuthSession, getBaseUrl, setBaseUrl } from '../api/client';

export default function AuthScreen({ onLoginSuccess, lang = 'bn' }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset' | 'server'
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('123456');
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
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      await setAuthSession(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError('সকল তথ্য পূরণ করুন');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name,
          business_name: businessName,
        }),
      });
      await setAuthSession(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !password || !confirmPassword) {
      setError('ইমেইল এবং নতুন পাসওয়ার্ড উভয়ই দিন');
      return;
    }
    if (password !== confirmPassword) {
      setError('উভয় পাসওয়ার্ড এক হতে হবে');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          newPassword: password,
        }),
      });
      setSuccessMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।');
      setMode('login');
    } catch (err) {
      setError(err.message);
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
                placeholder="http://10.142.165.153:4000"
                placeholderTextColor={THEME.colors.textDim}
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
                  <Text style={styles.inputLabel}>{t.owner_name}</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="আপনার পুরো নাম"
                    placeholderTextColor={THEME.colors.textDim}
                  />

                  <Text style={styles.inputLabel}>{t.business_name}</Text>
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="প্রতিষ্ঠানের নাম"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{t.email}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={THEME.colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>
                {mode === 'reset' ? t.new_password : t.password}
              </Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={THEME.colors.textDim}
                secureTextEntry
              />

              {mode === 'reset' && (
                <>
                  <Text style={styles.inputLabel}>{t.confirm_password}</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••"
                    placeholderTextColor={THEME.colors.textDim}
                    secureTextEntry
                  />
                </>
              )}

              {/* Submit Button */}
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
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    {mode === 'login' && t.login_btn}
                    {mode === 'signup' && t.signup_btn}
                    {mode === 'reset' && t.reset_btn}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Navigation links */}
              <View style={styles.linkContainer}>
                {mode === 'login' && (
                  <>
                    <TouchableOpacity onPress={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}>
                      <Text style={styles.linkText}>{t.forgot_password}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}>
                      <Text style={styles.linkAccent}>{t.need_account}</Text>
                    </TouchableOpacity>
                  </>
                )}

                {mode === 'signup' && (
                  <TouchableOpacity onPress={() => { setMode('login'); setError(''); setSuccessMsg(''); }}>
                    <Text style={styles.linkAccent}>{t.already_have_account}</Text>
                  </TouchableOpacity>
                )}

                {mode === 'reset' && (
                  <TouchableOpacity onPress={() => { setMode('login'); setError(''); setSuccessMsg(''); }}>
                    <Text style={styles.linkAccent}>{t.back_to_login}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Server Config link at footer */}
        <TouchableOpacity
          style={styles.serverFooter}
          onPress={() => { setMode('server'); setError(''); }}
        >
          <Text style={styles.serverFooterText}>⚙️ সার্ভার আইপি পরিবর্তন ({serverUrl})</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
    paddingTop: 50,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  logoBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.radius.lg,
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
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceLight,
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.text,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textDim,
    marginTop: 6,
    lineHeight: 16,
  },
  btnPrimary: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
  linkContainer: {
    marginTop: THEME.spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  linkAccent: {
    fontSize: 13,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: THEME.colors.primary,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    color: THEME.colors.primary,
    fontSize: 12,
  },
  serverFooter: {
    marginTop: 24,
    alignItems: 'center',
    padding: 8,
  },
  serverFooterText: {
    color: THEME.colors.textDim,
    fontSize: 12,
  },
});
