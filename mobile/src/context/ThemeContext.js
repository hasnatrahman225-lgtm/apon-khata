import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_THEME, LIGHT_THEME } from '../constants/theme';

const ThemeContext = createContext({
  theme: DARK_THEME,
  isDark: true,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = '@khata_theme_mode';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved !== null) {
          setIsDark(saved === 'dark');
        }
      })
      .catch((e) => console.log('Error reading theme mode', e));
  }, []);

  const toggleTheme = async () => {
    const nextState = !isDark;
    setIsDark(nextState);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextState ? 'dark' : 'light');
    } catch (e) {
      console.log('Error saving theme mode', e);
    }
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
