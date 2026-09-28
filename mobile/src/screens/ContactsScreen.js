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
  Alert
} from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest } from '../api/client';
import { formatTk } from '../utils/formatters';

export default function ContactsScreen({ type = 'customer', onSelectContact, lang = 'bn' }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;
  const isCustomer = type === 'customer';

  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/contacts?type=${type}`);
      const list = Array.isArray(data) ? data : (data?.contacts || []);
      setContacts(list);
      setError('');
    } catch (err) {
      setError(err.message);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [type]);

  const handleAddContact = async () => {
    if (!name.trim()) {
      Alert.alert('সতর্কতা', 'অনুগ্রহ করে নাম লিখুন');
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      setName('');
      setPhone('');
      setModalVisible(false);
      loadContacts();
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const filtered = safeContacts.filter((c) => {
    if (!c || !c.name) return false;
    const q = (search || '').toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const renderContactItem = ({ item }) => {
    const bal = Number(item.balance || 0);
    const isReceivable = bal > 0;
    const isPayable = bal < 0;

    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => onSelectContact(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phone || t.phone_none}</Text>
        </View>
        <View style={styles.balanceCol}>
          <Text
            style={[
              styles.balanceAmount,
              isReceivable
                ? { color: THEME.colors.primary }
                : isPayable
                ? { color: THEME.colors.danger }
                : { color: THEME.colors.textMuted },
            ]}
          >
            {formatTk(bal)}
          </Text>
          <Text style={styles.balanceStatus}>
            {isReceivable
              ? (isCustomer ? 'পাওনা' : 'অগ্রিম জমা')
              : isPayable
              ? (isCustomer ? 'জমা আছে' : 'দেনা')
              : 'সমান'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search and Add Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t.search_placeholder}
          placeholderTextColor={THEME.colors.textDim}
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ নতুন</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{t.no_contacts}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add Contact Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isCustomer ? t.add_customer : t.add_supplier}
            </Text>

            <Text style={styles.label}>{t.name} *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="নাম লিখুন"
              placeholderTextColor={THEME.colors.textDim}
            />

            <Text style={styles.label}>{t.phone}</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="০১৭১১..."
              placeholderTextColor={THEME.colors.textDim}
              keyboardType="phone-pad"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddContact}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t.save}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  header: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceLight,
  },
  searchInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: THEME.spacing.md,
    gap: 8,
  },
  contactCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  contactPhone: {
    fontSize: 12,
    color: THEME.colors.textDim,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceStatus: {
    fontSize: 11,
    color: THEME.colors.textDim,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: THEME.colors.textDim,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.xl,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 12,
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
    paddingVertical: 9,
    color: THEME.colors.text,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
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
});
