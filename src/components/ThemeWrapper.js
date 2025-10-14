import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import { createAppTheme } from '../theme/theme';

/**
 * ThemeWrapper Component
 * 
 * Wraps the application with Material-UI theme provider
 * and applies the current theme (light/dark) to all components.
 * 
 * Features:
 * - Dynamic theme switching
 * - CSS baseline reset
 * - Responsive design support
 */
const ThemeWrapper = ({ children }) => {
  const { theme } = useTheme();
  const muiTheme = createAppTheme(theme);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default ThemeWrapper;
