import React, { createContext, useContext, useState, useEffect } from 'react';

export type OrbitTheme = 'midnight' | 'light' | 'nordic' | 'instagram';

interface ThemeContextType {
  theme: OrbitTheme;
  setTheme: (theme: OrbitTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<OrbitTheme>(() => {
    const saved = localStorage.getItem('orbit-theme-key');
    return (saved as OrbitTheme) || 'midnight';
  });

  const setTheme = (newTheme: OrbitTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('orbit-theme-key', newTheme);
  };

  useEffect(() => {
    // Remove all previous theme classes
    const root = document.documentElement;
    const themes = ['theme-midnight', 'theme-light', 'theme-nordic', 'theme-instagram'];
    themes.forEach((t) => root.classList.remove(t));

    // Add new theme class
    root.classList.add(`theme-${theme}`);

    // Also apply to document.body for safety in styles
    const body = document.body;
    themes.forEach((t) => body.classList.remove(t));
    body.classList.add(`theme-${theme}`);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
