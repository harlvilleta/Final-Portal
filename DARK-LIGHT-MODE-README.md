# Dark/Light Mode Toggle for School Management System

A comprehensive dark/light mode toggle solution that can be integrated into both React applications and standalone HTML pages. This solution provides a professional, accessible, and user-friendly theme switching experience.

## 🌟 Features

- **Dual Integration**: Works with both React applications and standalone HTML pages
- **Persistent Storage**: Remembers user preference using localStorage
- **System Theme Detection**: Automatically detects and respects system theme preferences
- **Smooth Transitions**: Beautiful animations between theme changes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Professional Design**: School management system-appropriate styling
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Customizable**: Easy to customize colors, transitions, and behavior

## 📁 Files Included

### React Integration Files
- `src/contexts/ThemeContext.js` - React context for theme management
- `src/components/ThemeToggle.js` - React theme toggle component
- `src/components/ThemeWrapper.js` - Material-UI theme wrapper
- `src/theme/theme.js` - Material-UI theme configuration

### Standalone Files
- `dark-light-mode-standalone.html` - Complete standalone example
- `dark-light-mode-styles.css` - Standalone CSS styles
- `dark-light-mode-script.js` - Standalone JavaScript functionality

## 🚀 Quick Start

### For React Applications

1. **Copy the React files** to your project:
   ```bash
   # Copy the context, components, and theme files
   cp src/contexts/ThemeContext.js your-project/src/contexts/
   cp src/components/ThemeToggle.js your-project/src/components/
   cp src/components/ThemeWrapper.js your-project/src/components/
   cp src/theme/theme.js your-project/src/theme/
   ```

2. **Update your App.js**:
   ```jsx
   import { ThemeProvider as CustomThemeProvider } from "./contexts/ThemeContext";
   import ThemeWrapper from "./components/ThemeWrapper";
   import ThemeToggle from "./components/ThemeToggle";

   function App() {
     return (
       <CustomThemeProvider>
         <ThemeWrapper>
           {/* Your existing app content */}
           <AdminHeader />
           <ThemeToggle /> {/* Add to your header */}
         </ThemeWrapper>
       </CustomThemeProvider>
     );
   }
   ```

3. **Add the toggle to your headers**:
   ```jsx
   // In your header component
   import ThemeToggle from "./components/ThemeToggle";

   function AdminHeader() {
     return (
       <header>
         {/* Other header content */}
         <ThemeToggle />
       </header>
     );
   }
   ```

### For Standalone HTML Pages

1. **Include the CSS file**:
   ```html
   <link rel="stylesheet" href="dark-light-mode-styles.css">
   ```

2. **Include the JavaScript file**:
   ```html
   <script src="dark-light-mode-script.js"></script>
   ```

3. **Add the toggle button**:
   ```html
   <button id="themeToggle" class="theme-toggle" title="Toggle Dark/Light Mode">
     <svg id="themeIcon" viewBox="0 0 24 24" fill="currentColor">
       <!-- Icon will be dynamically updated -->
     </svg>
   </button>
   ```

4. **Use the CSS classes**:
   ```html
   <div class="card">
     <h2 class="card-title">Your Content</h2>
     <div class="card-content">
       <!-- Your content here -->
     </div>
   </div>
   ```

## 🎨 Customization

### CSS Variables

The theme system uses CSS variables for easy customization:

```css
:root {
  /* Light theme colors */
  --bg-primary: #ffffff;
  --text-primary: #333333;
  --accent-primary: #800000;
  /* ... more variables */
}

[data-theme="dark"] {
  /* Dark theme colors */
  --bg-primary: #121212;
  --text-primary: #ffffff;
  --accent-primary: #800000;
  /* ... more variables */
}
```

### JavaScript Configuration

```javascript
// Custom theme manager configuration
const themeManager = new ThemeManager({
  storageKey: 'myAppTheme',        // localStorage key
  defaultTheme: 'light',           // Default theme
  enableSystemTheme: true,         // Auto-detect system theme
  enableTransitions: true,         // Enable smooth transitions
  transitionDuration: 300          // Transition duration in ms
});
```

## 📱 Responsive Design

The solution includes responsive design features:

- **Mobile-first approach**: Optimized for mobile devices
- **Flexible sidebar**: Collapsible on smaller screens
- **Touch-friendly**: Large touch targets for mobile users
- **Adaptive typography**: Scales appropriately across devices

## ♿ Accessibility Features

- **Keyboard navigation**: Alt+T to toggle theme
- **Screen reader support**: Proper ARIA labels and descriptions
- **High contrast support**: Respects system high contrast preferences
- **Reduced motion support**: Respects prefers-reduced-motion
- **Focus indicators**: Clear focus states for keyboard users

## 🔧 Advanced Usage

### Listening to Theme Changes

```javascript
// Listen for theme changes
window.themeUtils.onThemeChange((detail) => {
  console.log('Theme changed to:', detail.theme);
  console.log('Is dark mode:', detail.isDark);
  console.log('Timestamp:', detail.timestamp);
  
  // Update charts, images, or other theme-dependent content
  updateCharts(detail.isDark);
  updateImages(detail.isDark);
});
```

### Programmatic Theme Control

```javascript
// Set theme programmatically
window.themeManager.setTheme('dark');

// Get current theme
const currentTheme = window.themeManager.getCurrentTheme();

// Check if dark mode is active
const isDark = window.themeUtils.isDarkMode();
```

### Custom Theme Colors

```javascript
// Get theme-aware colors
const backgroundColor = window.themeUtils.getThemeColor('#ffffff', '#121212');
const textColor = window.themeUtils.getThemeColor('#333333', '#ffffff');

// Set custom CSS variables
window.themeUtils.setCSSVariable('--custom-color', backgroundColor);
```

## 🎯 Integration Examples

### Admin Dashboard Integration

```jsx
// AdminHeader.jsx
import ThemeToggle from "./components/ThemeToggle";

function AdminHeader() {
  return (
    <header className="header">
      <div className="header-left"></div>
      <div className="header-center">
        <h1 className="logo">Student Affairs Management System</h1>
      </div>
      <div className="header-right">
        <ThemeToggle />
        <NotificationButton />
        <ProfileButton />
      </div>
    </header>
  );
}
```

### Teacher Dashboard Integration

```jsx
// TeacherHeader.jsx
import ThemeToggle from "./components/ThemeToggle";

function TeacherHeader() {
  return (
    <header className="header">
      <div className="header-left"></div>
      <div className="header-center">
        <h1 className="logo">Teacher Dashboard</h1>
      </div>
      <div className="header-right">
        <ThemeToggle />
        <NotificationButton />
        <ProfileButton />
      </div>
    </header>
  );
}
```

### Standalone HTML Integration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>School Management System</title>
    <link rel="stylesheet" href="dark-light-mode-styles.css">
</head>
<body>
    <header class="header">
        <div class="header-left"></div>
        <div class="header-center">
            <h1 class="logo">Student Affairs Management System</h1>
        </div>
        <div class="header-right">
            <button id="themeToggle" class="theme-toggle" title="Toggle Dark/Light Mode">
                <svg id="themeIcon" viewBox="0 0 24 24" fill="currentColor">
                    <!-- Icon will be dynamically updated -->
                </svg>
            </button>
            <!-- Other header buttons -->
        </div>
    </header>
    
    <div class="main-container">
        <nav class="sidebar">
            <!-- Sidebar content -->
        </nav>
        <main class="content">
            <!-- Main content -->
        </main>
    </div>
    
    <script src="dark-light-mode-script.js"></script>
</body>
</html>
```

## 🐛 Troubleshooting

### Common Issues

1. **Theme not persisting**: Check if localStorage is available and not disabled
2. **Transitions not smooth**: Ensure CSS transitions are enabled in your browser
3. **Icons not updating**: Verify the theme icon element has the correct ID
4. **Styles not applying**: Check if CSS variables are properly defined

### Debug Mode

```javascript
// Enable debug logging
window.themeManager = new ThemeManager({
  debug: true  // Add this option for detailed logging
});
```

## 📊 Browser Support

- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 12+
- **Edge**: 79+
- **Mobile browsers**: iOS Safari 12+, Chrome Mobile 60+

## 🔄 Updates and Maintenance

### Updating Themes

To update theme colors or add new themes:

1. **Update CSS variables** in the stylesheet
2. **Modify theme configuration** in the JavaScript
3. **Test across different browsers** and devices
4. **Update documentation** if needed

### Adding New Features

The theme system is designed to be extensible:

```javascript
// Extend the ThemeManager class
class CustomThemeManager extends ThemeManager {
  constructor(options) {
    super(options);
    this.customFeatures();
  }
  
  customFeatures() {
    // Add your custom theme features here
  }
}
```

## 📝 License

This dark/light mode toggle solution is provided as-is for educational and commercial use. Feel free to modify and adapt it to your specific needs.

## 🤝 Contributing

If you find bugs or have suggestions for improvements:

1. Test the solution thoroughly
2. Document any issues or improvements
3. Provide clear reproduction steps
4. Suggest specific solutions

## 📞 Support

For questions or support:

1. Check the troubleshooting section
2. Review the integration examples
3. Test with the standalone HTML file
4. Verify browser compatibility

---

**Happy theming!** 🎨✨
