import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest } from '../api/client';
import { formatTk, formatDate } from '../utils/formatters';

export default function DashboardScreen({ onNavigate, lang = 'bn' }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    total_receivable: 0,
    total_payable: 0,
    total_gave: 0,
    total_got: 0,
    net_balance: 0,
    customer_count: 0,
    supplier_count: 0,
  });
  const [recentTx, setRecentTx] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [sumData, txData] = await Promise.all([
        apiRequest('/dashboard/summary'),
        apiRequest('/transactions?limit=10'),
      ]);
      setSummary(sumData || {});
      const list = Array.isArray(txData) ? txData : (txData?.transactions || []);
      setRecentTx(list);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>ড্যাশবোর্ড লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>পুনরায় চেষ্টা করুন</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main KPI Cards: Receivable & Payable */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiCardReceivable]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>{t.receivable_label}</Text>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.15)' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>পাওনা</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>
            {formatTk(summary.total_receivable)}
          </Text>
          <Text style={styles.kpiSub}>{summary.customer_count || 0} জন কাস্টমার বাকি</Text>
        </View>

        <View style={[styles.kpiCard, styles.kpiCardPayable]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiTitle}>{t.payable_label}</Text>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : 'rgba(225, 29, 72, 0.15)' }]}>
              <Text style={[styles.badgeText, { color: theme.colors.danger }]}>দেনা</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: theme.colors.danger }]}>
            {formatTk(summary.total_payable)}
          </Text>
          <Text style={styles.kpiSub}>{summary.supplier_count || 0} জন সাপ্লায়ার দেনা</Text>
        </View>
      </View>

      {/* Secondary Flow Cards: Total Gave vs Total Got */}
      <View style={styles.flowRow}>
        <View style={styles.flowCard}>
          <Text style={styles.flowLabel}>{t.total_gave}</Text>
          <Text style={[styles.flowValue, { color: theme.colors.danger }]}>
            {formatTk(summary.total_gave)}
          </Text>
        </View>
        <View style={styles.flowCard}>
          <Text style={styles.flowLabel}>{t.total_got}</Text>
          <Text style={[styles.flowValue, { color: theme.colors.primary }]}>
            {formatTk(summary.total_got)}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => onNavigate('customers')}
        >
          <Text style={styles.actionBtnText}>👥 {t.nav_customers} ({summary.customer_count || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceLight, borderColor: theme.colors.surfaceBorder, borderWidth: 1 }]}
          onPress={() => onNavigate('suppliers')}
        >
          <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>
            🏭 {t.nav_suppliers} ({summary.supplier_count || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.recent_transactions}</Text>
          <TouchableOpacity onPress={() => onNavigate('reports')}>
            <Text style={styles.seeAllText}>সব রিপোর্ট ➔</Text>
          </TouchableOpacity>
        </View>

        {recentTx.length === 0 ? (
          <Text style={styles.emptyText}>{t.no_recent_transactions}</Text>
        ) : (
          recentTx.map((tx) => {
            const isGave = tx.direction === 'gave';
            return (
              <View key={tx.id} style={styles.txItem}>
                <View style={styles.txLeft}>
                  <Text style={styles.txContact}>{tx.contact_name || 'সাধারণ'}</Text>
                  <Text style={styles.txMeta}>
                    {formatDate(tx.occurred_at)} • {tx.category || 'নগদ'}
                  </Text>
                  {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isGave ? theme.colors.danger : theme.colors.primary },
                    ]}
                  >
                    {isGave ? '-' : '+'} {formatTk(tx.amount)}
                  </Text>
                  <Text style={styles.txDirLabel}>
                    {isGave ? 'দিলাম (বাকী)' : 'পেলাম (জমা)'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: theme.colors.textMuted,
    marginTop: 10,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(225, 29, 72, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryBtnText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
  },
  kpiCardReceivable: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  kpiCardPayable: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: theme.colors.textDim,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  flowCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: 'center',
  },
  flowLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  flowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  seeAllText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  txLeft: {
    flex: 1,
    paddingRight: 8,
  },
  txContact: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  txMeta: {
    fontSize: 11,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  txNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDirLabel: {
    fontSize: 10,
    color: theme.colors.textDim,
    marginTop: 2,
  },
});
