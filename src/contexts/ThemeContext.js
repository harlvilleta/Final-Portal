import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the theme context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Always default to 'light' mode on first load, regardless of saved preference
    // This ensures the system starts in light mode when running npm start
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    console.log('🎨 Theme initialized:', initialTheme, 'from localStorage:', savedTheme);
    return initialTheme;
  });

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Apply theme class to document body for global styling
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    console.log('🎨 Theme applied:', theme, 'body class:', document.body.className);
  }, [theme]);

  // Ensure light mode is applied on initial load
  useEffect(() => {
    // Set initial theme class on document body
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    console.log('🎨 Initial theme setup:', theme, 'body class:', document.body.className);
    
    // Also ensure the theme is properly initialized in localStorage
    if (!localStorage.getItem('theme')) {
      localStorage.setItem('theme', 'light');
      console.log('🎨 Set default theme in localStorage: light');
    }
  }, []); // Run only once on mount

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Force set theme to light mode (useful for testing)
  const setLightTheme = () => {
    setTheme('light');
  };

  // Force set theme to dark mode
  const setDarkTheme = () => {
    setTheme('dark');
  };

  // Check if current theme is dark
  const isDark = theme === 'dark';

  const value = {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isDark
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
