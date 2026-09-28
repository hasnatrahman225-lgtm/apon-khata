import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from './src/constants/theme';
import { TRANSLATIONS } from './src/constants/translations';
import { getAuthUser, getAuthToken, clearAuthSession } from './src/api/client';
import ErrorBoundary from './src/components/ErrorBoundary';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ContactDetailScreen from './src/screens/ContactDetailScreen';
import StockScreen from './src/screens/StockScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

function MainApp() {
  const [user, setUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'customers' | 'suppliers' | 'stock' | 'reports' | 'settings'
  const [activeContact, setActiveContact] = useState(null); // When inside an individual khata
  const [lang, setLang] = useState('bn');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAuthToken();
      const authUser = await getAuthUser();
      if (token && authUser) {
        setUser(authUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setUser(null);
    setActiveContact(null);
    setCurrentTab('dashboard');
  };

  if (initialLoading) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>খাতা</Text>
        </View>
        <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // Not logged in -> Show Auth screen
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
        <AuthScreen
          onLoginSuccess={(loggedUser) => setUser(loggedUser)}
          lang={lang}
        />
      </SafeAreaView>
    );
  }

  // Render current tab content
  const renderContent = () => {
    if (activeContact) {
      return (
        <ContactDetailScreen
          contact={activeContact}
          onBack={() => setActiveContact(null)}
          lang={lang}
        />
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={(tab) => {
              setActiveContact(null);
              setCurrentTab(tab);
            }}
            lang={lang}
          />
        );
      case 'customers':
        return (
          <ContactsScreen
            type="customer"
            onSelectContact={(c) => setActiveContact(c)}
            lang={lang}
          />
        );
      case 'suppliers':
        return (
          <ContactsScreen
            type="supplier"
            onSelectContact={(c) => setActiveContact(c)}
            lang={lang}
          />
        );
      case 'stock':
        return <StockScreen lang={lang} />;
      case 'reports':
        return <ReportsScreen lang={lang} />;
      case 'settings':
        return (
          <SettingsScreen
            user={user}
            onLogout={handleLogout}
            lang={lang}
            onLanguageChange={(newLang) => setLang(newLang)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.surface} />

      {/* Top App Header (visible when not in contact detail) */}
      {!activeContact && (
        <View style={styles.appHeader}>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogo}>
              <Text style={styles.headerLogoText}>খাতা</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{t.app_title}</Text>
              <Text style={styles.headerSub}>{user?.business_name || user?.businessName || user?.name || 'ব্যবসায়ী'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.langToggle}
            onPress={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          >
            <Text style={styles.langToggleText}>{lang === 'bn' ? 'EN' : 'বাং'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main View Area */}
      <View style={styles.mainContent}>
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </View>

      {/* Bottom Navigation Bar */}
      {!activeContact && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navTab, currentTab === 'dashboard' && styles.navTabActive]}
            onPress={() => setCurrentTab('dashboard')}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'dashboard' && styles.navLabelActive,
              ]}
            >
              {t.nav_dashboard}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, currentTab === 'customers' && styles.navTabActive]}
            onPress={() => setCurrentTab('customers')}
          >
            <Text style={styles.navIcon}>👥</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'customers' && styles.navLabelActive,
              ]}
            >
              {t.nav_customers}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, currentTab === 'suppliers' && styles.navTabActive]}
            onPress={() => setCurrentTab('suppliers')}
          >
            <Text style={styles.navIcon}>🏭</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'suppliers' && styles.navLabelActive,
              ]}
            >
              {t.nav_suppliers}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, currentTab === 'stock' && styles.navTabActive]}
            onPress={() => setCurrentTab('stock')}
          >
            <Text style={styles.navIcon}>📦</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'stock' && styles.navLabelActive,
              ]}
            >
              {t.nav_stock}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, currentTab === 'reports' && styles.navTabActive]}
            onPress={() => setCurrentTab('reports')}
          >
            <Text style={styles.navIcon}>📑</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'reports' && styles.navLabelActive,
              ]}
            >
              {t.nav_reports}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, currentTab === 'settings' && styles.navTabActive]}
            onPress={() => setCurrentTab('settings')}
          >
            <Text style={styles.navIcon}>⚙️</Text>
            <Text
              style={[
                styles.navLabel,
                currentTab === 'settings' && styles.navLabelActive,
              ]}
            >
              {t.nav_settings}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  splash: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.radius.lg,
  },
  logoBadgeText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headerLogoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: THEME.colors.textDim,
  },
  langToggle: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  mainContent: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingVertical: 6,
    paddingBottom: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  navTabActive: {
    borderTopWidth: 2,
    borderTopColor: THEME.colors.primary,
  },
  navIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: THEME.colors.textDim,
    fontWeight: '600',
  },
  navLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
