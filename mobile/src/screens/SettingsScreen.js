import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS } from '../constants/translations';
import { getBaseUrl, setBaseUrl, apiRequest } from '../api/client';

export default function SettingsScreen({ user, onLogout, lang = 'bn', onLanguageChange }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [serverUrl, setServerUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    getBaseUrl().then(setServerUrl);
  }, []);

  const handleSaveServer = async () => {
    if (!serverUrl.trim()) return;
    await setBaseUrl(serverUrl.trim());
    Alert.alert('সফল', 'সার্ভার আইপি সংরক্ষণ করা হয়েছে!');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('সতর্কতা', 'সবগুলো ফিল্ড পূরণ করুন');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('সতর্কতা', 'নতুন পাসওয়ার্ড দুইটি এক নয়');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('সতর্কতা', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    setPwLoading(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      Alert.alert('সফল', 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{t.settings_title}</Text>

      {/* User Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>👤 ব্যবহারকারীর তথ্য</Text>
        <Text style={styles.userName}>{user?.name || 'ব্যবহারকারী'}</Text>
        <Text style={styles.userSub}>{user?.email}</Text>
        {user?.business_name ? (
          <Text style={styles.userBusiness}>🏢 {user.business_name}</Text>
        ) : null}
      </View>

      {/* Language Switch */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🌐 {t.language}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              lang === 'bn' && styles.langBtnActive,
            ]}
            onPress={() => onLanguageChange('bn')}
          >
            <Text style={[styles.langBtnText, lang === 'bn' && styles.langBtnTextActive]}>
              🇧🇩 বাংলা
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langBtn,
              lang === 'en' && styles.langBtnActive,
            ]}
            onPress={() => onLanguageChange('en')}
          >
            <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>
              🇬🇧 English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🔒 পাসওয়ার্ড পরিবর্তন</Text>

        <Text style={styles.label}>বর্তমান পাসওয়ার্ড</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••"
          placeholderTextColor={THEME.colors.textDim}
          secureTextEntry
        />

        <Text style={styles.label}>নতুন পাসওয়ার্ড</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="••••••"
          placeholderTextColor={THEME.colors.textDim}
          secureTextEntry
        />

        <Text style={styles.label}>নতুন পাসওয়ার্ড নিশ্চিত করুন</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••"
          placeholderTextColor={THEME.colors.textDim}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={handleChangePassword}
          disabled={pwLoading}
        >
          <Text style={styles.btnPrimaryText}>পাসওয়ার্ড আপডেট করুন</Text>
        </TouchableOpacity>
      </View>

      {/* Server IP Config */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>⚙️ {t.server_config}</Text>
        <Text style={styles.helperText}>{t.server_help}</Text>
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://192.168.25.27:4000"
          placeholderTextColor={THEME.colors.textDim}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveServer}>
          <Text style={styles.btnSecondaryText}>{t.save_server}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>🚪 {t.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  userSub: {
    fontSize: 12,
    color: THEME.colors.textDim,
    marginTop: 2,
  },
  userBusiness: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  langBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  langBtnTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textDim,
    lineHeight: 16,
  },
  btnPrimary: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondaryText: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: THEME.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
