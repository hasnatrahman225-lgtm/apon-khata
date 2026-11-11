import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { TRANSLATIONS } from '../constants/translations';
import { apiRequest } from '../api/client';
import { formatTk } from '../utils/formatters';

export default function StockScreen({ lang = 'bn' }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStock = async () => {
    try {
      const data = await apiRequest('/stock');
      const list = Array.isArray(data) ? data : (data?.items || []);
      setItems(list);
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('সতর্কতা', 'পণ্যের নাম লিখুন');
      return;
    }
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;
    if (q <= 0) {
      Alert.alert('সতর্কতা', 'সঠিক পরিমাণ লিখুন');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/stock', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          quantity: q,
          unit_price: p,
        }),
      });
      setName('');
      setQuantity('');
      setUnitPrice('');
      setModalVisible(false);
      loadStock();
    } catch (err) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => {
    const qty = Number(item.quantity || 0);
    const unitP = Number(item.unit_price || 0);
    const totalVal = qty * unitP;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSub}>
            দর: {formatTk(unitP)} / ইউনিট
          </Text>
        </View>
        <View style={styles.itemRight}>
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyText}>{qty} {item.unit || 'পিস'}</Text>
          </View>
          <Text style={styles.totalValue}>{formatTk(totalVal)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.nav_stock}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ পণ্য যোগ</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>কোনো স্টক পণ্য পাওয়া যায়নি</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Add Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন স্টক পণ্য যোগ করুন</Text>

            <Text style={styles.label}>পণ্যের নাম *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="পণ্যের নাম"
              placeholderTextColor={theme.colors.textDim}
            />

            <Text style={styles.label}>পরিমাণ *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              placeholderTextColor={theme.colors.textDim}
              keyboardType="numeric"
            />

            <Text style={styles.label}>প্রতি ইউনিটের দর (৳)</Text>
            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textDim}
              keyboardType="numeric"
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
                onPress={handleAddItem}
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

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: theme.spacing.md,
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  itemSub: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  qtyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: theme.colors.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: theme.colors.textDim,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
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
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: theme.colors.surfaceLight,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
