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

export default function StockScreen({ lang = 'bn' }) {
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

  const handleAddStock = async () => {
    if (!name.trim()) {
      Alert.alert('সতর্কতা', 'পণ্যের নাম দিন');
      return;
    }
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(unitPrice) || 0;

    setSubmitting(true);
    try {
      await apiRequest('/stock', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          item_name: name.trim(),
          quantity: q,
          unitPrice: p,
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

  const safeItems = Array.isArray(items) ? items : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.stock_title}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>{t.add_product}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : safeItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t.no_stock}</Text>
        </View>
      ) : (
        <FlatList
          data={safeItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const totalVal = (item.quantity || 0) * (item.unit_price || 0);
            return (
              <View style={styles.itemCard}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name || item.item_name}</Text>
                  <Text style={styles.itemSub}>
                    একক মূল্য: {formatTk(item.unit_price)}
                  </Text>
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>স্টক: {item.quantity}</Text>
                  </View>
                  <Text style={styles.totalValue}>{formatTk(totalVal)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.add_product}</Text>

            <Text style={styles.label}>{t.product_name} *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="যেমন: চিনি, ডাল, সাবান"
              placeholderTextColor={THEME.colors.textDim}
            />

            <Text style={styles.label}>{t.quantity}</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              placeholderTextColor={THEME.colors.textDim}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t.unit_price}</Text>
            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="0.00"
              placeholderTextColor={THEME.colors.textDim}
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
                onPress={handleAddStock}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceLight,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  addBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: THEME.spacing.md,
  },
  itemCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
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
    color: THEME.colors.text,
  },
  itemSub: {
    fontSize: 12,
    color: THEME.colors.textDim,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  qtyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: THEME.colors.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  center: {
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
    paddingVertical: 8,
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
