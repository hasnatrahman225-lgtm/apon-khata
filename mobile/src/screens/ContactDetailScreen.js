import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share
} from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest, getBaseUrl, getAuthToken } from '../api/client';
import { formatTk, formatDate } from '../utils/formatters';

export default function ContactDetailScreen({ contact, onBack, lang = 'bn' }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;
  const isCustomer = contact.type === 'customer';

  const [contactData, setContactData] = useState(contact);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editTx, setEditTx] = useState(null); // null means new transaction
  const [direction, setDirection] = useState(isCustomer ? 'gave' : 'got');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const CATEGORY_PRESETS = isCustomer
    ? ['পণ্য বাকী বিক্রয়', 'বকেয়া আদায়', 'অগ্রিম গ্রহণ', 'নগদ জমা', 'ছাড়/কমিশন', 'অন্যান্য']
    : ['কাঁচামাল ক্রয়', 'সাপ্লায়ার বিল পরিশোধ', 'অগ্রিম প্রদান', 'পরিবহন খরচ', 'অন্যান্য'];

  const loadDetails = async () => {
    try {
      const [cRes, txRes] = await Promise.all([
        apiRequest(`/contacts/${contact.id}`),
        apiRequest(`/transactions?contactId=${contact.id}&contact_id=${contact.id}&limit=100`),
      ]);
      const contactObj = cRes?.contact || cRes || contact;
      setContactData(contactObj);
      const list = Array.isArray(txRes) ? txRes : (txRes?.transactions || cRes?.transactions || []);
      setTransactions(list);
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [contact.id]);

  const openAddModal = (dir) => {
    setEditTx(null);
    setDirection(dir);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(dir === 'gave' ? 'পণ্য বাকী বিক্রয়' : 'বকেয়া আদায়');
    setNote('');
    setModalVisible(true);
  };

  const openEditModal = (tx) => {
    setEditTx(tx);
    setDirection(tx.direction);
    setAmount(String(tx.amount));
    setDate(tx.occurred_at ? tx.occurred_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setCategory(tx.category || '');
    setNote(tx.note || '');
    setModalVisible(true);
  };

  const handleSaveTransaction = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক টাকার পরিমাণ দিন');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: num,
        direction,
        category: category.trim(),
        note: note.trim(),
        occurredAt: date ? `${date}T12:00:00.000Z` : undefined,
        occurred_at: date ? `${date}T12:00:00.000Z` : undefined,
        contactId: contact.id,
        contact_id: contact.id,
      };

      if (editTx) {
        await apiRequest(`/transactions/${editTx.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setModalVisible(false);
      loadDetails();
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = (tx) => {
    Alert.alert('নিশ্চিত করুন', 'এই লেনদেনটি মুছে ফেলতে চান?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/transactions/${tx.id}`, { method: 'DELETE' });
            loadDetails();
          } catch (err) {
            Alert.alert('ত্রুটি', err.message);
          }
        },
      },
    ]);
  };

  const bal = Number(contactData.balance || 0);
  const isReceivable = bal > 0;
  const isPayable = bal < 0;

  const handleDownloadReport = async () => {
    try {
      const baseUrl = await getBaseUrl();
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (token) params.append('token', token);
      params.append('contactId', contact.id);

      const url = `${baseUrl}/reports/statement?${params.toString()}`;
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('ত্রুটি', 'ডাউনলোড লিংকটি খোলা যাচ্ছে না');
      }
    } catch (e) {
      Alert.alert('ত্রুটি', e.message);
    }
  };

  const handleShareReport = async () => {
    try {
      let msg = `📋 আপন খাতা — হিসাব বিবরণী\n`;
      msg += `👤 পক্ষ: ${contactData.name}\n`;
      if (contactData.phone) msg += `📞 ফোন: ${contactData.phone}\n`;
      msg += `---------------------------\n`;
      msg += `⚖️ বর্তমান বকেয়া: ${formatTk(bal)} (${isReceivable ? 'পাওনা' : isPayable ? 'জমা' : 'সমান'})\n`;
      msg += `---------------------------\n`;
      msg += `সাম্প্রতিক লেনদেন:\n`;

      const safeTx = Array.isArray(transactions) ? transactions : [];
      safeTx.slice(0, 10).forEach((tx, idx) => {
        const d = tx.occurred_at ? tx.occurred_at.split('T')[0] : '';
        const dir = tx.direction === 'gave' ? 'দিলাম (-)' : 'পেলাম (+)';
        msg += `${idx + 1}. ${d} | ${dir} ${formatTk(tx.amount)} (${tx.category || 'নগদ'})\n`;
      });
      msg += `\n— আপন খাতা ডিজিটাল খাতা`;

      await Share.share({
        title: `হিসাব বিবরণী - ${contactData.name}`,
        message: msg,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>‹ ফেরত</Text>
        </TouchableOpacity>
        <View style={styles.topInfo}>
          <Text style={styles.topName}>{contactData.name}</Text>
          <Text style={styles.topPhone}>{contactData.phone || t.phone_none}</Text>
        </View>
        <View style={styles.topBalance}>
          <Text
            style={[
              styles.topBalanceAmount,
              isReceivable
                ? { color: THEME.colors.primary }
                : isPayable
                ? { color: THEME.colors.danger }
                : { color: THEME.colors.textMuted },
            ]}
          >
            {formatTk(bal)}
          </Text>
          <Text style={styles.topBalanceLabel}>
            {isReceivable ? 'পাওনা' : isPayable ? 'জমা' : 'সমান'}
          </Text>
        </View>
      </View>

      {/* Quick Report Download & Share Bar */}
      <View style={styles.statementBar}>
        <Text style={styles.statementBarTitle}>ব্যক্তিগত স্টেটমেন্ট:</Text>
        <View style={styles.statementBtns}>
          <TouchableOpacity style={styles.btnPdfSmall} onPress={handleDownloadReport}>
            <Text style={styles.btnPdfSmallText}>📄 PDF রিপোর্ট</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnShareSmall} onPress={handleShareReport}>
            <Text style={styles.btnShareSmallText}>📤 শেয়ার</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons: দিলাম (লাল) vs পেলাম (সবুজ) */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: THEME.colors.danger }]}
          onPress={() => openAddModal('gave')}
        >
          <Text style={styles.actionBtnIcon}>↑</Text>
          <Text style={styles.actionBtnText}>
            {isCustomer ? 'দিলাম (বাকী)' : 'দিলাম (পরিশোধ)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: THEME.colors.primary }]}
          onPress={() => openAddModal('got')}
        >
          <Text style={styles.actionBtnIcon}>↓</Text>
          <Text style={styles.actionBtnText}>
            {isCustomer ? 'পেলাম (আদায়)' : 'পেলাম (মাল ক্রয়)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (Array.isArray(transactions) ? transactions : []).length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>এখনো কোনো লেনদেন যোগ করা হয়নি। নিচে বাটন চেপে এন্ট্রি করুন।</Text>
        </View>
      ) : (
        <FlatList
          data={Array.isArray(transactions) ? transactions : []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.txList}
          renderItem={({ item }) => {
            const isGave = item.direction === 'gave';
            const dateStr = item.occurred_at ? item.occurred_at.split('T')[0] : '';
            return (
              <View style={styles.txCard}>
                <View style={styles.txMain}>
                  <View style={styles.txLeft}>
                    <View style={styles.txBadgeRow}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isGave
                              ? 'rgba(244, 63, 94, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: isGave
                                ? THEME.colors.danger
                                : THEME.colors.primary,
                            },
                          ]}
                        >
                          {isGave ? 'দিলাম' : 'পেলাম'}
                        </Text>
                      </View>
                      <Text style={styles.txDate}>{dateStr}</Text>
                    </View>
                    <Text style={styles.txCategory}>
                      {item.category || 'নগদ হিসাব'}
                    </Text>
                    {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: isGave
                            ? THEME.colors.danger
                            : THEME.colors.primary,
                        },
                      ]}
                    >
                      {formatTk(item.amount)}
                    </Text>
                  </View>
                </View>

                {/* Edit / Delete footer */}
                <View style={styles.txFooter}>
                  <TouchableOpacity
                    style={styles.txBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Text style={styles.txBtnEdit}>✏️ এডিট</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.txBtn}
                    onPress={() => handleDeleteTransaction(item)}
                  >
                    <Text style={styles.txBtnDelete}>🗑️ মুছুন</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add / Edit Transaction Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editTx ? 'লেনদেন এডিট করুন' : 'নতুন লেনদেন এন্ট্রি'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Direction selector */}
              <View style={styles.dirSwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.dirSwitchBtn,
                    direction === 'gave' && styles.dirSwitchActiveGave,
                  ]}
                  onPress={() => setDirection('gave')}
                >
                  <Text
                    style={[
                      styles.dirSwitchText,
                      direction === 'gave' && styles.dirSwitchActiveText,
                    ]}
                  >
                    দিলাম (বাকী / খরচ)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dirSwitchBtn,
                    direction === 'got' && styles.dirSwitchActiveGot,
                  ]}
                  onPress={() => setDirection('got')}
                >
                  <Text
                    style={[
                      styles.dirSwitchText,
                      direction === 'got' && styles.dirSwitchActiveText,
                    ]}
                  >
                    পেলাম (জমা / আদায়)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={styles.label}>টাকার পরিমাণ (৳) *</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={THEME.colors.textDim}
                keyboardType="numeric"
              />

              {/* Date */}
              <Text style={styles.label}>তারিখ (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="2026-09-05"
                placeholderTextColor={THEME.colors.textDim}
              />

              {/* Category */}
              <Text style={styles.label}>লেনদেন / খরচের খাত</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="যেমন: পণ্য বিক্রয়, পরিবহন"
                placeholderTextColor={THEME.colors.textDim}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
                {CATEGORY_PRESETS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.presetChip}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={styles.presetChipText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note */}
              <Text style={styles.label}>নোট / বিবরণ (ঐচ্ছিক)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={note}
                onChangeText={setNote}
                placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন"
                placeholderTextColor={THEME.colors.textDim}
                multiline
              />

              {/* Save & Cancel */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveTransaction}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{t.save}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceLight,
  },
  backBtn: {
    paddingRight: 10,
  },
  backBtnText: {
    fontSize: 16,
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  topPhone: {
    fontSize: 11,
    color: THEME.colors.textDim,
  },
  topBalance: {
    alignItems: 'flex-end',
  },
  topBalanceAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  topBalanceLabel: {
    fontSize: 10,
    color: THEME.colors.textDim,
  },
  actionRow: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    gap: 6,
  },
  actionBtnIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  txList: {
    padding: THEME.spacing.md,
    gap: 8,
  },
  txCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 8,
  },
  txMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flex: 1,
  },
  txBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  txDate: {
    fontSize: 11,
    color: THEME.colors.textDim,
  },
  txCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  txNote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceLight,
  },
  txBtn: {
    paddingVertical: 2,
  },
  txBtnEdit: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  txBtnDelete: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: THEME.colors.textDim,
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.xl,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  closeBtn: {
    fontSize: 18,
    color: THEME.colors.textDim,
    padding: 4,
  },
  dirSwitchRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.radius.md,
    padding: 3,
    marginBottom: 12,
  },
  dirSwitchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  dirSwitchActiveGave: {
    backgroundColor: THEME.colors.danger,
  },
  dirSwitchActiveGot: {
    backgroundColor: THEME.colors.primary,
  },
  dirSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  dirSwitchActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 14,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  presetRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  presetChip: {
    backgroundColor: THEME.colors.surfaceLight,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  presetChipText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: THEME.colors.surfaceLight,
  },
  cancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  statementBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  statementBarTitle: {
    fontSize: 11,
    color: THEME.colors.textDim,
    fontWeight: '600',
  },
  statementBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPdfSmall: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnPdfSmallText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  btnShareSmall: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.colors.accent,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnShareSmallText: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
