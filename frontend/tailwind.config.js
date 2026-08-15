/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Signal & Brass Color System ===
        surface: {
          base: "#0C0D0F",       // Page background
          secondary: "#131417",  // Navbar / sidebar
          DEFAULT: "#191B1F",    // Cards / panels
          elevated: "#202226",   // Dropdowns / modals
        },
        border: {
          DEFAULT: "#2C2F35",    // Standard border
          subtle: "#1E2025",     // Hairline divider
        },
        text: {
          primary: "#F2F1ED",    // Warm paper-white
          secondary: "#8E9096",  // Metadata / labels
          muted: "#52555C",      // Placeholders
        },
        teal: {
          DEFAULT: "#2BA88C",    // Primary accent
          dim: "#1D7260",        // Active state bg
          faint: "#0D3028",      // Subtle tint bg
        },
        brass: {
          DEFAULT: "#C9A227",    // Secondary accent — sparingly
          dim: "#8A6E1A",
          faint: "#2A220A",
        },
        rust: {
          DEFAULT: "#B5533C",    // Rare tertiary — brand mark only
        },
        // Semantic — keep standard for legibility
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        'inset-teal': 'inset 0 0 0 1px #2BA88C',
        'inset-brass': 'inset 0 0 0 1px #C9A227',
      },
      animation: {
        'sonar': 'sonar 1.6s ease-out 1',
        'bar-fill': 'bar-fill 0.8s ease-out forwards',
      },
      keyframes: {
        sonar: {
          '0%': { transform: 'scale(1)', opacity: '0.7', boxShadow: '0 0 0 0 #2BA88C40' },
          '100%': { transform: 'scale(1)', opacity: '0', boxShadow: '0 0 0 14px #2BA88C00' },
        },
        'bar-fill': {
          from: { width: '0%' },
          to: { width: 'var(--bar-width)' },
        },
      },
    },
  },
  plugins: [],
}
