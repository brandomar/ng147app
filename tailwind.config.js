import { BRAND_CONFIG } from './src/config/branding.ts';

/**
 * Dynamic Tailwind Configuration for Whitelabel Support
 * 
 * This configuration dynamically generates Tailwind classes
 * based on the brand configuration.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dynamic brand colors from configuration
        brand: {
          primary: BRAND_CONFIG.primaryColor,
          secondary: BRAND_CONFIG.secondaryColor,
          accent: BRAND_CONFIG.accentColor,
          background: BRAND_CONFIG.backgroundColor,
          text: BRAND_CONFIG.textColor,
        },
        // Legacy undeniable colors for backward compatibility
        undeniable: {
          black: '#0A0A0A',
          violet: BRAND_CONFIG.primaryColor,
          mint: BRAND_CONFIG.secondaryColor,
          gold: BRAND_CONFIG.accentColor,
        },
        // Neutral colors (unchanged)
        neutral: {
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      // Custom CSS variables for dynamic theming
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Brand-specific spacing and sizing
      spacing: {
        'brand-xs': '0.25rem',
        'brand-sm': '0.5rem',
        'brand-md': '1rem',
        'brand-lg': '1.5rem',
        'brand-xl': '2rem',
      },
      // Brand-specific border radius
      borderRadius: {
        'brand-sm': '0.25rem',
        'brand-md': '0.5rem',
        'brand-lg': '0.75rem',
        'brand-xl': '1rem',
      },
      // Brand-specific shadows
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'brand-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'brand-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'brand-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      // Brand-specific gradients
      backgroundImage: {
        'brand-gradient': `linear-gradient(135deg, ${BRAND_CONFIG.primaryColor} 0%, ${BRAND_CONFIG.secondaryColor} 100%)`,
        'brand-gradient-subtle': `linear-gradient(135deg, ${BRAND_CONFIG.primaryColor}20 0%, ${BRAND_CONFIG.secondaryColor}20 100%)`,
      },
    },
  },
  plugins: [
    // Custom plugin for brand-specific utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.brand-primary': {
          color: BRAND_CONFIG.primaryColor,
        },
        '.brand-secondary': {
          color: BRAND_CONFIG.secondaryColor,
        },
        '.brand-accent': {
          color: BRAND_CONFIG.accentColor,
        },
        '.bg-brand-primary': {
          backgroundColor: BRAND_CONFIG.primaryColor,
        },
        '.bg-brand-secondary': {
          backgroundColor: BRAND_CONFIG.secondaryColor,
        },
        '.bg-brand-accent': {
          backgroundColor: BRAND_CONFIG.accentColor,
        },
        '.border-brand-primary': {
          borderColor: BRAND_CONFIG.primaryColor,
        },
        '.border-brand-secondary': {
          borderColor: BRAND_CONFIG.secondaryColor,
        },
        '.border-brand-accent': {
          borderColor: BRAND_CONFIG.accentColor,
        },
        '.text-brand-primary': {
          color: BRAND_CONFIG.primaryColor,
        },
        '.text-brand-secondary': {
          color: BRAND_CONFIG.secondaryColor,
        },
        '.text-brand-accent': {
          color: BRAND_CONFIG.accentColor,
        },
        '.hover\\:bg-brand-primary:hover': {
          backgroundColor: BRAND_CONFIG.primaryColor,
        },
        '.hover\\:bg-brand-secondary:hover': {
          backgroundColor: BRAND_CONFIG.secondaryColor,
        },
        '.hover\\:text-brand-primary:hover': {
          color: BRAND_CONFIG.primaryColor,
        },
        '.hover\\:text-brand-secondary:hover': {
          color: BRAND_CONFIG.secondaryColor,
        },
        '.focus\\:ring-brand-primary:focus': {
          '--tw-ring-color': BRAND_CONFIG.primaryColor,
        },
        '.focus\\:ring-brand-secondary:focus': {
          '--tw-ring-color': BRAND_CONFIG.secondaryColor,
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
};