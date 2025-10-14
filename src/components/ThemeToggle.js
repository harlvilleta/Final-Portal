import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ThemeToggle Component
 * 
 * A toggle button that switches between light and dark themes.
 * Displays a sun icon for light mode and moon icon for dark mode.
 * 
 * Features:
 * - Visual feedback with appropriate icons
 * - Tooltip showing current mode and action
 * - Smooth transitions
 * - Accessible design
 */
const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Tooltip 
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      arrow
    >
      <IconButton
        onClick={toggleTheme}
        size="large"
        aria-label="toggle theme"
        sx={{
          color: 'inherit',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            transform: 'scale(1.05)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          }
        }}
      >
        {isDark ? (
          <LightMode 
            sx={{ 
              fontSize: 24,
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#ffeb3b', // Yellow color for sun icon
              }
            }} 
          />
        ) : (
          <DarkMode 
            sx={{ 
              fontSize: 24,
              transition: 'all 0.3s ease',
              '&:hover': {
                color: '#9c27b0', // Purple color for moon icon
              }
            }} 
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
