import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>একটি রেন্ডার সমস্যা হয়েছে</Text>
            <Text style={styles.subtitle}>
              অ্যাপটি ক্র্যাশ না করে নিরাপদে আটকানো হয়েছে। নিচে কারণ দেখুন:
            </Text>

            <ScrollView style={styles.logBox}>
              <Text style={styles.logText}>
                {this.state.error?.toString() || 'Unknown runtime error'}
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>🔄 পুনরায় চেষ্টা করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  card: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.danger,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  logBox: {
    width: '100%',
    maxHeight: 140,
    backgroundColor: THEME.colors.bg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  logText: {
    fontSize: 11,
    color: '#fca5a5',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
