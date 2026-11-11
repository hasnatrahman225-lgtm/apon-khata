import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TRANSLATIONS } from '../constants/translations';
import { getBaseUrl, setBaseUrl, apiRequest } from '../api/client';

export default function SettingsScreen({ user, onLogout, lang = 'bn', onLanguageChange }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
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

      {/* Theme Mode Switch */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🎨 থিম মোড (Day / Night Mode)</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              !isDark && styles.langBtnActive,
            ]}
            onPress={() => { if (isDark) toggleTheme(); }}
          >
            <Text style={[styles.langBtnText, !isDark && styles.langBtnTextActive]}>
              ☀️ দিন (Day Mode)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langBtn,
              isDark && styles.langBtnActive,
            ]}
            onPress={() => { if (!isDark) toggleTheme(); }}
          >
            <Text style={[styles.langBtnText, isDark && styles.langBtnTextActive]}>
              🌙 রাত (Night Mode)
            </Text>
          </TouchableOpacity>
        </View>
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
          placeholderTextColor={theme.colors.textDim}
          secureTextEntry
        />

        <Text style={styles.label}>নতুন পাসওয়ার্ড</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="••••••"
          placeholderTextColor={theme.colors.textDim}
          secureTextEntry
        />

        <Text style={styles.label}>নতুন পাসওয়ার্ড নিশ্চিত করুন</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••"
          placeholderTextColor={theme.colors.textDim}
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

      {/* Cloud Server Info */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>☁️ ক্লাউড ডাটাবেস স্ট্যাটাস</Text>
        <Text style={styles.helperText}>আপনার অ্যাপটি সরাসরি Google Firebase Cloud ডাটাবেসের সাথে যুক্ত। কোনো ব্যক্তিগত কম্পিউটার চালু রাখা ছাড়াই সার্বক্ষণিক ২৪/৭ নিরাপদে সিঙ্ক থাকবে।</Text>
        <View style={{ marginTop: 10, padding: 12, backgroundColor: isDark ? '#132f22' : '#dcfce7', borderRadius: 8, borderWidth: 1, borderColor: '#059669' }}>
          <Text style={{ color: '#059669', fontWeight: 'bold' }}>🟢 স্ট্যাটাস: সক্রিয় (Google Firebase Cloud)</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>প্রজেক্ট: apan-khata</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutBtnText}>🚪 {t.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  userSub: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  userBusiness: {
    fontSize: 13,
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  langBtnTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.textDim,
    lineHeight: 16,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
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
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondaryText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
