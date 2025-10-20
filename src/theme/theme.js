import { createTheme } from '@mui/material/styles';

/**
 * Create Material-UI theme with support for both light and dark modes
 * 
 * @param {string} mode - 'light' or 'dark'
 * @returns {Object} Material-UI theme object
 */
export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode: mode,
      primary: { 
        main: '#800000',
        light: '#a00000',
        dark: '#600000',
        contrastText: '#ffffff'
      },
      secondary: { 
        main: '#636e72',
        light: '#8a9ba0',
        dark: '#4a5458',
        contrastText: '#ffffff'
      },
      background: {
        default: isDark ? '#121212' : '#ffffff',
        paper: isDark ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#333333',
        secondary: isDark ? '#e0e0e0' : '#666666',
        disabled: isDark ? '#888888' : '#999999',
      },
      divider: isDark ? '#333333' : '#e0e0e0',
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        color: isDark ? '#ffffff' : '#800000',
      },
      h6: {
        fontWeight: 600,
        color: isDark ? '#ffffff' : '#333333',
      },
      body1: {
        color: isDark ? '#ffffff' : '#333333',
      },
      body2: {
        color: isDark ? '#e0e0e0' : '#666666',
      },
    },
    components: {
      // AppBar customization
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            color: isDark ? '#ffffff' : '#333333',
            boxShadow: isDark 
              ? '0 2px 4px rgba(0,0,0,0.3)' 
              : '0 2px 4px rgba(0,0,0,0.1)',
            borderBottom: isDark 
              ? '1px solid #404040' 
              : '1px solid #e0e0e0',
          }
        }
      },
      // Card customization
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            border: isDark 
              ? '1px solid #404040' 
              : '1px solid #e0e0e0',
            '&:hover': {
              backgroundColor: isDark 
                ? '#3a3a3a' 
                : '#f8f9fa',
              boxShadow: isDark 
                ? '0 4px 8px rgba(0,0,0,0.3)' 
                : '0 4px 8px rgba(0,0,0,0.1)',
            }
          }
        }
      },
      // Paper customization
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            border: isDark 
              ? '1px solid #404040' 
              : '1px solid #e0e0e0',
          }
        }
      },
      // Button customization
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            backgroundColor: '#800000',
            '&:hover': { 
              backgroundColor: '#6b0000' 
            }
          },
          outlinedPrimary: {
            borderColor: '#800000',
            color: '#800000',
            '&:hover': { 
              borderColor: '#6b0000', 
              backgroundColor: isDark ? 'rgba(128, 0, 0, 0.1)' : 'rgba(128, 0, 0, 0.05)' 
            }
          },
          textPrimary: {
            color: '#800000',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(128, 0, 0, 0.1)' : 'rgba(128, 0, 0, 0.05)'
            }
          }
        }
      },
      // Table customization
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#404040' : '#f5f5f5',
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark ? '1px solid #404040' : '1px solid #e0e0e0',
            color: isDark ? '#ffffff' : '#333333',
          },
          head: {
            color: isDark ? '#ffffff' : '#333333',
            fontWeight: 600,
          }
        }
      },
      // Menu customization
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            border: isDark ? '1px solid #404040' : '1px solid #e0e0e0',
          }
        }
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: isDark ? '#ffffff' : '#333333',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }
          }
        }
      },
      // Chip customization
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#404040' : '#f0f0f0',
            color: isDark ? '#ffffff' : '#333333',
          }
        }
      },
      // Dialog customization
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
            border: isDark ? '1px solid #404040' : '1px solid #e0e0e0',
          }
        }
      },
      // TextField customization
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isDark ? '#404040' : '#ffffff',
              '& fieldset': {
                borderColor: isDark ? '#666666' : '#e0e0e0',
              },
              '&:hover fieldset': {
                borderColor: isDark ? '#999999' : '#b0b0b0',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#800000',
              },
            },
            '& .MuiInputLabel-root': {
              color: isDark ? '#b0b0b0' : '#666666',
            },
            '& .MuiInputBase-input': {
              color: isDark ? '#ffffff' : '#333333',
            }
          }
        }
      },
      // IconButton customization
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: isDark ? '#ffffff' : '#666666',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }
          }
        }
      },
      // Sidebar customization
      MuiListItem: {
        styleOverrides: {
          root: {
            color: isDark ? '#ffffff' : '#ffffff', // White text for sidebar in both modes
            '&:hover': {
              backgroundColor: isDark ? 'rgba(74, 85, 104, 0.8)' : 'rgba(74, 85, 104, 0.8)',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? 'rgba(99, 110, 114, 0.8)' : 'rgba(99, 110, 114, 0.8)',
              color: isDark ? '#ffffff' : '#ffffff',
            }
          }
        }
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: isDark ? '#ffffff' : '#ffffff', // White text for sidebar items
            fontWeight: 500,
          },
          secondary: {
            color: isDark ? '#b0b0b0' : '#e0e0e0', // Lighter secondary text
          }
        }
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: isDark ? '#ffffff' : '#ffffff', // White icons for sidebar
            minWidth: 40,
          }
        }
      },
      // Typography customization for dashboard numbers
      MuiTypography: {
        styleOverrides: {
          h1: {
            color: isDark ? '#ffffff' : '#333333',
          },
          h2: {
            color: isDark ? '#ffffff' : '#333333',
          },
          h3: {
            color: isDark ? '#ffffff' : '#333333',
          },
          h4: {
            color: isDark ? '#ffffff' : '#800000',
          },
          h5: {
            color: isDark ? '#ffffff' : '#333333',
          },
          h6: {
            color: isDark ? '#ffffff' : '#333333',
          },
          subtitle1: {
            color: isDark ? '#ffffff' : '#333333',
          },
          subtitle2: {
            color: isDark ? '#e0e0e0' : '#666666',
          },
          caption: {
            color: isDark ? '#e0e0e0' : '#666666',
          },
          overline: {
            color: isDark ? '#e0e0e0' : '#666666',
          }
        }
      }
    },
    // Custom breakpoints for responsive design
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    // Custom spacing
    spacing: 8,
    // Custom shape
    shape: {
      borderRadius: 8,
    },
    // Custom shadows - provide complete shadow array for both themes
    shadows: [
      'none',
      '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
      '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
      '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
      '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 5px 8px 0px rgba(0,0,0,0.14),0px 1px 14px 0px rgba(0,0,0,0.12)',
      '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
      '0px 4px 5px -2px rgba(0,0,0,0.2),0px 7px 10px 1px rgba(0,0,0,0.14),0px 2px 16px 1px rgba(0,0,0,0.12)',
      '0px 5px 5px -3px rgba(0,0,0,0.2),0px 8px 10px 1px rgba(0,0,0,0.14),0px 3px 14px 2px rgba(0,0,0,0.12)',
      '0px 5px 6px -3px rgba(0,0,0,0.2),0px 9px 12px 1px rgba(0,0,0,0.14),0px 3px 16px 2px rgba(0,0,0,0.12)',
      '0px 6px 6px -3px rgba(0,0,0,0.2),0px 10px 14px 1px rgba(0,0,0,0.14),0px 4px 18px 3px rgba(0,0,0,0.12)',
      '0px 6px 7px -4px rgba(0,0,0,0.2),0px 11px 15px 1px rgba(0,0,0,0.14),0px 4px 20px 3px rgba(0,0,0,0.12)',
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 12px 17px 2px rgba(0,0,0,0.14),0px 5px 22px 4px rgba(0,0,0,0.12)',
      '0px 7px 8px -4px rgba(0,0,0,0.2),0px 13px 19px 2px rgba(0,0,0,0.14),0px 5px 24px 4px rgba(0,0,0,0.12)',
      '0px 7px 9px -4px rgba(0,0,0,0.2),0px 14px 21px 2px rgba(0,0,0,0.14),0px 5px 26px 4px rgba(0,0,0,0.12)',
      '0px 8px 9px -5px rgba(0,0,0,0.2),0px 15px 22px 2px rgba(0,0,0,0.14),0px 6px 28px 5px rgba(0,0,0,0.12)',
      '0px 8px 10px -5px rgba(0,0,0,0.2),0px 16px 24px 2px rgba(0,0,0,0.14),0px 6px 30px 5px rgba(0,0,0,0.12)',
      '0px 8px 11px -5px rgba(0,0,0,0.2),0px 17px 26px 2px rgba(0,0,0,0.14),0px 6px 32px 5px rgba(0,0,0,0.12)',
      '0px 9px 11px -5px rgba(0,0,0,0.2),0px 18px 28px 2px rgba(0,0,0,0.14),0px 7px 34px 6px rgba(0,0,0,0.12)',
      '0px 9px 12px -6px rgba(0,0,0,0.2),0px 19px 29px 2px rgba(0,0,0,0.14),0px 7px 36px 6px rgba(0,0,0,0.12)',
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 20px 31px 3px rgba(0,0,0,0.14),0px 8px 38px 7px rgba(0,0,0,0.12)',
      '0px 10px 13px -6px rgba(0,0,0,0.2),0px 21px 33px 3px rgba(0,0,0,0.14),0px 8px 40px 7px rgba(0,0,0,0.12)',
      '0px 10px 14px -6px rgba(0,0,0,0.2),0px 22px 35px 3px rgba(0,0,0,0.14),0px 8px 42px 7px rgba(0,0,0,0.12)',
      '0px 11px 14px -7px rgba(0,0,0,0.2),0px 23px 36px 3px rgba(0,0,0,0.14),0px 9px 44px 8px rgba(0,0,0,0.12)',
      '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)'
    ],
  });
};

export default createAppTheme;
