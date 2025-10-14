/**
 * Dark/Light Mode Toggle Script
 * 
 * This JavaScript file provides a complete dark/light mode toggle functionality
 * that can be integrated into any HTML page.
 * 
 * Features:
 * - Toggle between light and dark themes
 * - Persist theme preference in localStorage
 * - Smooth transitions between themes
 * - System theme detection
 * - Professional school system design
 * - Accessibility support
 * - Event system for theme changes
 * 
 * Usage:
 * 1. Include this script in your HTML
 * 2. Add the theme toggle button with id="themeToggle"
 * 3. Add the theme icon with id="themeIcon"
 * 4. Use data-theme="dark" attribute on body for dark mode
 * 
 * Example HTML:
 * <button id="themeToggle" class="theme-toggle">
 *   <svg id="themeIcon" viewBox="0 0 24 24" fill="currentColor">
 *     <!-- Icon will be dynamically updated -->
 *   </svg>
 * </button>
 */

class ThemeManager {
    constructor(options = {}) {
        // Configuration options
        this.options = {
            storageKey: 'theme',
            defaultTheme: 'light',
            enableSystemTheme: true,
            enableTransitions: true,
            transitionDuration: 300,
            ...options
        };

        // DOM elements
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = document.getElementById('themeIcon');
        
        // Current theme state
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        
        // Initialize the theme manager
        this.init();
    }

    /**
     * Initialize the theme manager
     */
    init() {
        // Apply stored theme on page load
        this.applyTheme(this.currentTheme);
        
        // Add event listener for theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Listen for system theme changes
        if (this.options.enableSystemTheme && window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.mediaQuery.addListener((e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!this.getStoredTheme()) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }

        // Add keyboard support
        document.addEventListener('keydown', (e) => {
            // Alt + T to toggle theme
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Log initialization
        console.log('Theme Manager initialized with theme:', this.currentTheme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.storeTheme(this.currentTheme);
        
        // Dispatch custom event
        this.dispatchThemeChange(this.currentTheme);
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    /**
     * Apply the specified theme
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        const body = document.body;
        const isDark = theme === 'dark';
        
        // Update data attribute for CSS
        body.setAttribute('data-theme', theme);
        
        // Update theme icon
        this.updateThemeIcon(isDark);
        
        // Update page title for accessibility
        this.updatePageTitle(theme);
        
        // Add smooth transition class
        if (this.options.enableTransitions) {
            this.addTransitionClass();
        }
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(isDark);
        
        // Update favicon if available
        this.updateFavicon(isDark);
    }

    /**
     * Update the theme toggle icon
     * @param {boolean} isDark - Whether the current theme is dark
     */
    updateThemeIcon(isDark) {
        if (!this.themeIcon) return;

        if (isDark) {
            // Show sun icon for switching to light mode
            this.themeIcon.innerHTML = `
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
            `;
            this.themeToggle.title = 'Switch to Light Mode (Alt+T)';
        } else {
            // Show moon icon for switching to dark mode
            this.themeIcon.innerHTML = `
                <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
            `;
            this.themeToggle.title = 'Switch to Dark Mode (Alt+T)';
        }
    }

    /**
     * Update page title for accessibility
     * @param {string} theme - Current theme
     */
    updatePageTitle(theme) {
        const baseTitle = document.title.replace(/ - (Light|Dark) Mode$/, '');
        document.title = `${baseTitle} - ${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`;
    }

    /**
     * Add transition class for smooth theme changes
     */
    addTransitionClass() {
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, this.options.transitionDuration);
    }

    /**
     * Update meta theme-color for mobile browsers
     * @param {boolean} isDark - Whether the current theme is dark
     */
    updateMetaThemeColor(isDark) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = isDark ? '#121212' : '#ffffff';
    }

    /**
     * Update favicon based on theme
     * @param {boolean} isDark - Whether the current theme is dark
     */
    updateFavicon(isDark) {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            // You can customize this to use different favicons for different themes
            // For now, we'll just update the color scheme
            favicon.href = isDark ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>' 
                                 : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">☀️</text></svg>';
        }
    }

    /**
     * Store theme preference in localStorage
     * @param {string} theme - Theme to store
     */
    storeTheme(theme) {
        try {
            localStorage.setItem(this.options.storageKey, theme);
        } catch (error) {
            console.warn('Could not save theme preference:', error);
        }
    }

    /**
     * Get stored theme preference from localStorage
     * @returns {string|null} Stored theme or null
     */
    getStoredTheme() {
        try {
            return localStorage.getItem(this.options.storageKey);
        } catch (error) {
            console.warn('Could not retrieve theme preference:', error);
            return null;
        }
    }

    /**
     * Get system theme preference
     * @returns {string} System theme preference
     */
    getSystemTheme() {
        if (this.options.enableSystemTheme && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return this.options.defaultTheme;
    }

    /**
     * Get current theme
     * @returns {string} Current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     * @param {string} theme - Theme to set
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.storeTheme(theme);
            this.dispatchThemeChange(theme);
        }
    }

    /**
     * Dispatch theme change event
     * @param {string} newTheme - The new theme
     */
    dispatchThemeChange(newTheme) {
        const event = new CustomEvent('themeChanged', {
            detail: { 
                theme: newTheme,
                isDark: newTheme === 'dark',
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Destroy the theme manager and clean up event listeners
     */
    destroy() {
        if (this.themeToggle) {
            this.themeToggle.removeEventListener('click', this.toggleTheme);
        }
        
        if (this.mediaQuery) {
            this.mediaQuery.removeListener();
        }
        
        document.removeEventListener('keydown', this.handleKeydown);
    }
}

// Utility functions for theme management
const ThemeUtils = {
    /**
     * Check if the current theme is dark
     * @returns {boolean} True if dark theme is active
     */
    isDarkMode() {
        return document.body.getAttribute('data-theme') === 'dark';
    },

    /**
     * Get theme-aware color value
     * @param {string} lightColor - Color for light theme
     * @param {string} darkColor - Color for dark theme
     * @returns {string} Appropriate color for current theme
     */
    getThemeColor(lightColor, darkColor) {
        return this.isDarkMode() ? darkColor : lightColor;
    },

    /**
     * Add theme change listener
     * @param {Function} callback - Function to call when theme changes
     * @returns {Function} Function to remove the listener
     */
    onThemeChange(callback) {
        const handler = (event) => callback(event.detail);
        document.addEventListener('themeChanged', handler);
        return () => document.removeEventListener('themeChanged', handler);
    },

    /**
     * Get CSS custom property value
     * @param {string} property - CSS custom property name
     * @returns {string} Property value
     */
    getCSSVariable(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    },

    /**
     * Set CSS custom property value
     * @param {string} property - CSS custom property name
     * @param {string} value - Property value
     */
    setCSSVariable(property, value) {
        document.documentElement.style.setProperty(property, value);
    },

    /**
     * Create a theme-aware element
     * @param {string} tagName - HTML tag name
     * @param {Object} options - Element options
     * @returns {HTMLElement} Created element
     */
    createThemedElement(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        // Add theme-aware styling
        element.style.transition = 'all 0.3s ease';
        
        return element;
    }
};

// Auto-initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if theme manager is already initialized
    if (!window.themeManager) {
        window.themeManager = new ThemeManager();
        window.themeUtils = ThemeUtils;
        
        // Log initialization
        console.log('Theme Manager auto-initialized with theme:', window.themeManager.getCurrentTheme());
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager, ThemeUtils };
}

// Example usage and integration guide
const ThemeIntegrationGuide = {
    /**
     * Basic integration example
     */
    basicExample: `
        // HTML
        <button id="themeToggle" class="theme-toggle">
            <svg id="themeIcon" viewBox="0 0 24 24" fill="currentColor">
                <!-- Icon will be dynamically updated -->
            </svg>
        </button>

        // CSS
        :root { /* Light theme variables */ }
        [data-theme="dark"] { /* Dark theme variables */ }

        // JavaScript (auto-initialized)
        // No additional code needed!
    `,

    /**
     * Advanced integration example
     */
    advancedExample: `
        // Custom initialization
        const themeManager = new ThemeManager({
            storageKey: 'myAppTheme',
            defaultTheme: 'dark',
            enableSystemTheme: true,
            transitionDuration: 500
        });

        // Listen for theme changes
        themeManager.onThemeChange((detail) => {
            console.log('Theme changed to:', detail.theme);
            // Update charts, images, or other theme-dependent content
        });

        // Programmatic theme control
        themeManager.setTheme('dark');
        console.log('Current theme:', themeManager.getCurrentTheme());
    `,

    /**
     * React integration example
     */
    reactExample: `
        // React component
        import { useEffect, useState } from 'react';

        function ThemeToggle() {
            const [isDark, setIsDark] = useState(false);

            useEffect(() => {
                const removeListener = window.themeUtils.onThemeChange((detail) => {
                    setIsDark(detail.isDark);
                });

                return removeListener;
            }, []);

            return (
                <button 
                    onClick={() => window.themeManager.toggleTheme()}
                    className="theme-toggle"
                >
                    {isDark ? '☀️' : '🌙'}
                </button>
            );
        }
    `
};

// Make integration guide available globally
window.ThemeIntegrationGuide = ThemeIntegrationGuide;
