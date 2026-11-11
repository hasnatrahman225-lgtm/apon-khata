import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Share
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest, getBaseUrl, getAuthToken, getAuthUser } from '../api/client';
import { formatTk, formatDate } from '../utils/formatters';
import { generateAndSharePdf } from '../utils/pdfGenerator';

export default function ReportsScreen({ lang = 'bn' }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [filterPreset, setFilterPreset] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    loadReports();
  }, [filterPreset, selectedContactId]);

  const loadContacts = async () => {
    try {
      const data = await apiRequest('/contacts');
      const list = Array.isArray(data) ? data : (data?.contacts || []);
      setContacts(list);
    } catch (e) {
      console.error(e);
      setContacts([]);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (filterPreset === 'today') {
      return { from: todayStr, to: todayStr };
    }
    if (filterPreset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      return { from: yStr, to: yStr };
    }
    if (filterPreset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      return { from: pastStr, to: todayStr };
    }
    if (filterPreset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      return { from: pastStr, to: todayStr };
    }
    if (filterPreset === 'month') {
      const firstDay = `${yyyy}-${mm}-01`;
      return { from: firstDay, to: todayStr };
    }
    if (filterPreset === 'custom') {
      return { from: customFrom.trim(), to: customTo.trim() };
    }
    return {}; // All
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const params = new URLSearchParams();
      if (selectedContactId) {
        params.append('contactId', selectedContactId);
        params.append('contact_id', selectedContactId);
      }
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      params.append('limit', '300');

      const data = await apiRequest(`/transactions?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data?.transactions || []);
      setTransactions(list);
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  const uniqueContactNames = Array.from(new Set(safeTransactions.map((t) => t.contact_name).filter(Boolean)));
  const isSingleContact = Boolean(selectedContactId || (safeTransactions.length > 0 && uniqueContactNames.length === 1));
  const activeContact = safeContacts.find((c) => String(c.id) === String(selectedContactId)) ||
    (isSingleContact && safeTransactions.length > 0
      ? { name: safeTransactions[0].contact_name, type: safeTransactions[0].contact_type }
      : null);

  const totalGave = safeTransactions
    .filter((t) => t.direction === 'gave')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalGot = safeTransactions
    .filter((t) => t.direction === 'got')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const handleDownload = async (type = 'pdf') => {
    try {
      const user = await getAuthUser();
      const selectedContact = safeContacts.find((c) => String(c.id) === String(selectedContactId));
      const { from, to } = getDateRange();
      const dateRangeStr = from && to ? `${from} হতে ${to}` : 'সকল সময়';

      await generateAndSharePdf({
        title: selectedContact ? `${selectedContact.name} — হিসাব স্টেটমেন্ট` : 'সার্বিক হিসাব রিপোর্ট',
        contact: selectedContact || null,
        transactions: safeTransactions,
        merchantName: user ? (user.name || user.email) : '',
        businessName: user ? (user.business_name || '') : '',
        dateRangeStr,
      });
    } catch (e) {
      Alert.alert('ত্রুটি', e.message || 'PDF তৈরি করা যায়নি');
    }
  };

  const handleShare = async () => {
    try {
      const selectedContact = safeContacts.find((c) => String(c.id) === String(selectedContactId));
      const contactName = selectedContact ? selectedContact.name : 'সকল কাস্টমার/সাপ্লায়ার';
      const { from, to } = getDateRange();
      const dateStr = from && to ? `${from} হতে ${to}` : 'সকল সময়';

      let msg = `📋 আপন খাতা — হিসাব বিবরণী\n`;
      msg += `👤 পক্ষ: ${contactName}\n`;
      msg += `📅 সময়সীমা: ${dateStr}\n`;
      msg += `---------------------------\n`;
      msg += `🔴 মোট দিলাম (বাকী): ${formatTk(totalGave)}\n`;
      msg += `🟢 মোট পেলাম (জমা): ${formatTk(totalGot)}\n`;
      msg += `⚖️ বকেয়া স্থিতি: ${formatTk(totalGave - totalGot)}\n`;
      msg += `---------------------------\n`;
      msg += `মোট লেনদেন: ${safeTransactions.length} টি\n\n`;

      safeTransactions.slice(0, 15).forEach((tx, idx) => {
        const d = tx.occurred_at ? tx.occurred_at.split('T')[0] : '';
        const dir = tx.direction === 'gave' ? 'দিলাম (-)' : 'পেলাম (+)';
        msg += `${idx + 1}. ${d} | ${tx.contact_name || ''} | ${dir} ${formatTk(tx.amount)} (${tx.category || 'নগদ'})\n`;
      });

      if (safeTransactions.length > 15) {
        msg += `...এবং আরও ${safeTransactions.length - 15} টি লেনদেন।\n`;
      }
      msg += `\n— আপন খাতা ডিজিটাল খাতা`;

      await Share.share({
        title: `হিসাব বিবরণী - ${contactName}`,
        message: msg,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title & Download Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.title}>{t.reports_title}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.actionBtnPdf} onPress={() => handleDownload('pdf')}>
            <Text style={styles.actionBtnPdfText}>📥 PDF রিপোর্ট</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnCsv} onPress={() => handleDownload('csv')}>
            <Text style={styles.actionBtnCsvText}>📊 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnShare} onPress={handleShare}>
            <Text style={styles.actionBtnShareText}>📤 শেয়ার</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preset Filter Chips (Time Schedule) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
        {[
          { key: 'all', label: t.filter_all_time || 'সব সময়' },
          { key: 'today', label: t.filter_today || 'আজ' },
          { key: 'yesterday', label: t.filter_yesterday || 'গতকাল' },
          { key: '7days', label: t.filter_7days || 'গত ৭ দিন' },
          { key: '30days', label: t.filter_30days || 'গত ৩০ দিন' },
          { key: 'month', label: t.filter_month || 'চলতি মাস' },
          { key: 'custom', label: t.filter_custom || 'কাস্টম সময়' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.presetChip,
              filterPreset === item.key && styles.presetChipActive,
            ]}
            onPress={() => setFilterPreset(item.key)}
          >
            <Text
              style={[
                styles.presetChipText,
                filterPreset === item.key && styles.presetChipActiveText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom Date Inputs (when 'custom' preset is selected) */}
      {filterPreset === 'custom' && (
        <View style={styles.customDateBox}>
          <View style={styles.dateInputCol}>
            <Text style={styles.dateInputLabel}>{t.from_date || 'শুরু তারিখ'}</Text>
            <TextInput
              style={styles.dateInput}
              value={customFrom}
              onChangeText={setCustomFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textDim}
            />
          </View>
          <View style={styles.dateInputCol}>
            <Text style={styles.dateInputLabel}>{t.to_date || 'শেষ তারিখ'}</Text>
            <TextInput
              style={styles.dateInput}
              value={customTo}
              onChangeText={setCustomTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textDim}
            />
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={loadReports}>
            <Text style={styles.applyBtnText}>🔍 {t.apply_filter || 'দেখুন'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contact Filter Horizontal Scroll (Customer-Wise) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactScroll}>
        <TouchableOpacity
          style={[
            styles.contactChip,
            selectedContactId === '' && styles.contactChipActive,
          ]}
          onPress={() => setSelectedContactId('')}
        >
          <Text
            style={[
              styles.contactChipText,
              selectedContactId === '' && styles.contactChipActiveText,
            ]}
          >
            {t.all_contacts}
          </Text>
        </TouchableOpacity>
        {safeContacts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.contactChip,
              selectedContactId === String(c.id) && styles.contactChipActive,
            ]}
            onPress={() => setSelectedContactId(String(c.id))}
          >
            <Text
              style={[
                styles.contactChipText,
                selectedContactId === String(c.id) && styles.contactChipActiveText,
              ]}
            >
              {c.name} ({c.type === 'customer' ? 'কাস্টমার' : 'সাপ্লায়ার'})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Customer Header Banner if single contact */}
      {activeContact && (
        <View style={styles.activeContactBanner}>
          <Text style={styles.activeContactText}>
            👤 {activeContact.name} ({activeContact.type === 'supplier' ? 'সাপ্লায়ার' : 'কাস্টমার'})
          </Text>
        </View>
      )}

      {/* Summary Row */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>মোট দিলাম</Text>
          <Text style={[styles.summaryVal, { color: theme.colors.danger }]}>
            {formatTk(totalGave)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>মোট পেলাম</Text>
          <Text style={[styles.summaryVal, { color: theme.colors.primary }]}>
            {formatTk(totalGot)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>মোট রেকর্ড</Text>
          <Text style={[styles.summaryVal, { color: theme.colors.accent }]}>
            {safeTransactions.length} টি
          </Text>
        </View>
      </View>

      {/* Table Rows: Compact Single-Line */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : safeTransactions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।</Text>
        </View>
      ) : (
        <FlatList
          data={safeTransactions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isGave = item.direction === 'gave';
            const dateStr = formatDate(item.occurred_at || item.created_at);
            return (
              <View style={styles.compactRow}>
                <View style={styles.rowDateCol}>
                  <Text style={styles.rowDate}>{dateStr}</Text>
                  {!isSingleContact && (
                    <Text style={styles.rowType}>
                      {item.contact_type === 'supplier' ? '🏭 সা.' : '👤 কা.'}
                    </Text>
                  )}
                </View>
                <View style={styles.rowNameCol}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {isSingleContact
                      ? item.note || item.category || (isGave ? 'দিলাম' : 'পেলাম')
                      : item.contact_name || 'সাধারণ'}
                  </Text>
                  <Text style={styles.rowCategory} numberOfLines={1}>
                    {item.category || (isGave ? 'দিলাম (বাকী)' : 'পেলাম (জমা)')}
                  </Text>
                </View>
                <View style={styles.rowAmountCol}>
                  <Text
                    style={[
                      styles.rowAmount,
                      { color: isGave ? theme.colors.danger : theme.colors.primary },
                    ]}
                  >
                    {isGave ? '-' : '+'} {formatTk(item.amount)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  topActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnPdf: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnPdfText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnCsv: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnCsvText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnShare: {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)',
    borderColor: theme.colors.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnShareText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  presetScroll: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    maxHeight: 44,
  },
  presetChip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    color: theme.colors.textDim,
    fontWeight: '600',
  },
  presetChipActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customDateBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: theme.spacing.md,
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  dateInputCol: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 10,
    color: theme.colors.textDim,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contactScroll: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    maxHeight: 42,
  },
  contactChip: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  contactChipActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  contactChipText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  contactChipActiveText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  activeContactBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
  },
  activeContactText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38bdf8',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.colors.textDim,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  list: {
    padding: theme.spacing.md,
    paddingTop: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rowDateCol: {
    width: 85,
  },
  rowDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  rowType: {
    fontSize: 9,
    color: theme.colors.textDim,
  },
  rowNameCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowCategory: {
    fontSize: 11,
    color: theme.colors.textDim,
  },
  rowAmountCol: {
    alignItems: 'flex-end',
    width: 90,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 13,
  },
});
