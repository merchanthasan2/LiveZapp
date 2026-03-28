/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Brand palette ── */
        'pale-sky':      '#BBDEF0',
        teal:            '#00A6A6',
        'teal-hover':    '#008A8A',
        amber:           '#EFCA08',
        'golden-orange': '#F49F0A',
        'deep-orange':   '#F08700',
        success:         '#22C55E',
        danger:          '#EF4444',

        /* ── Surfaces ── */
        bg:              '#F5F7FA',
        'bg-base':       '#F5F7FA',
        'bg-card':       '#FFFFFF',
        sidebar:         '#BBDEF0',

        /* ── Text ── */
        'text-primary':   '#1A1A2E',
        'text-secondary': '#6B7280',
        'text-muted':     '#9CA3AF',

        /* ── Legacy aliases (keep existing tailwind classes working) ── */
        primary:         '#00A6A6',
        'primary-hover': '#008A8A',
        secondary:       '#EFCA08',
        accent:          '#F49F0A',
        hot:             '#F08700',
        live:            '#F08700',
        sky:             '#BBDEF0',
      },

      fontFamily: {
        display: ['Inter', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'hero-sm': ['2.5rem',  { lineHeight: '1.1',  fontWeight: '800' }],
        'hero-lg': ['3rem',    { lineHeight: '1.1',  fontWeight: '800' }],
        'hero-xl': ['3.75rem', { lineHeight: '1.06', fontWeight: '800' }],
      },

      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },

      boxShadow: {
        card:            '0 1px 4px rgba(0,0,0,0.06)',
        'card-hover':    '0 4px 16px rgba(0,0,0,0.10)',
        'btn-primary':   '0 2px 8px rgba(0,166,166,0.25)',
      },

      backgroundImage: {
        'gradient-main':    'linear-gradient(135deg, #F5F7FA 0%, #EAF0F5 100%)',
        'gradient-primary': 'linear-gradient(135deg, #00A6A6 0%, #008A8A 100%)',
        'gradient-amber':   'linear-gradient(135deg, #EFCA08 0%, #D4B000 100%)',
        'gradient-live':    'linear-gradient(135deg, #F08700 0%, #D97400 100%)',
        'gradient-accent':  'linear-gradient(135deg, #F49F0A 0%, #F08700 100%)',
        'gradient-success': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      },

      animation: {
        'live-dot':   'liveDot 1.4s ease-in-out infinite',
        'glow-ring':  'glowRing 2.2s ease-in-out infinite',
        shimmer:      'shimmer 1.8s linear infinite',
        float:        'float 4s ease-in-out infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },

      keyframes: {
        liveDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%':     { opacity: '0.35', transform: 'scale(0.72)' },
        },
        glowRing: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(240,135,0,0.55)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(240,135,0,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        fadeIn:  { from: { opacity: '0' },                               to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' },            '50%': { transform: 'translateY(-8px)' } },
      },
    },
  },
  plugins: [],
}
