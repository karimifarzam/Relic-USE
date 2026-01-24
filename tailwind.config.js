module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{js,jsx,ts,tsx,html}',
    './src/main/**/*.{js,jsx,ts,tsx,html}',
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Industrial precision dark theme
        industrial: {
          black: {
            primary: '#000000',
            secondary: '#0a0a0a',
            tertiary: '#1a1a1a',
            elevated: '#141414',
          },
          white: {
            primary: '#ffffff',
            secondary: '#a0a0a0',
            tertiary: '#666666',
          },
          border: {
            DEFAULT: '#2a2a2a',
            subtle: '#1a1a1a',
          },
          orange: '#ff9500',
          blue: '#007aff',
          green: '#34c759',
          red: '#ff3b30',
          yellow: '#ffcc00',
        },
        // Tremor light theme
        tremor: {
          brand: {
            faint: "#eff6ff",
            muted: "#bfdbfe",
            subtle: "#60a5fa",
            DEFAULT: "#3b82f6",
            emphasis: "#1d4ed8",
            inverted: "#ffffff",
          },
          background: {
            muted: "#f9fafb",
            subtle: "#f3f4f6",
            DEFAULT: "#ffffff",
            emphasis: "#374151",
          },
          border: {
            DEFAULT: "#e5e7eb",
          },
          ring: {
            DEFAULT: "#e5e7eb",
          },
          content: {
            subtle: "#9ca3af",
            DEFAULT: "#6b7280",
            emphasis: "#374151",
            strong: "#111827",
            inverted: "#ffffff",
          },
        },
        // Tremor dark theme
        "dark-tremor": {
          brand: {
            faint: "#1a1a1a",
            muted: "#2a2a2a",
            subtle: "#007aff",
            DEFAULT: "#007aff",
            emphasis: "#0051d5",
            inverted: "#000000",
          },
          background: {
            muted: "#000000",
            subtle: "#0a0a0a",
            DEFAULT: "#000000",
            emphasis: "#ffffff",
          },
          border: {
            DEFAULT: "#2a2a2a",
          },
          ring: {
            DEFAULT: "#2a2a2a",
          },
          content: {
            subtle: "#666666",
            DEFAULT: "#a0a0a0",
            emphasis: "#ffffff",
            strong: "#ffffff",
            inverted: "#000000",
          },
        },
      },
      boxShadow: {
        'industrial': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'industrial-sm': '0 1px 4px rgba(0, 0, 0, 0.3)',
        'industrial-lg': '0 4px 16px rgba(0, 0, 0, 0.5)',
        "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.3)",
        "tremor-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
        "tremor-dropdown": "0 4px 16px rgba(0, 0, 0, 0.5)",
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.625rem", { lineHeight: "1rem", letterSpacing: "0.05em" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["2.25rem", { lineHeight: "2.5rem", fontWeight: "300" }],
      },
      gridTemplateColumns: {
        '19': 'repeat(19, minmax(0, 1fr))',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      letterSpacing: {
        'industrial': '0.05em',
        'industrial-wide': '0.1em',
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [require("@headlessui/tailwindcss")],
};