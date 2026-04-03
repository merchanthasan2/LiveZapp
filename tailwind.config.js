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
        /* ── New brand palette ── */
        ink:        '#000814',
        prussian:   '#001d3d',
        navy:       '#003566',
        yellow:     '#ffc300',
        gold:       '#ffd60a',
        persian:    '#072ac8',
        dodger:     '#1e96fc',
        icy:        '#a2d6f9',
        success:    '#22C55E',
        danger:     '#EF4444',

        /* ── Surfaces ── */
        bg:         '#000814',
        'bg-base':  '#000814',
        'bg-card':  '#001d3d',
        sidebar:    '#001d3d',

        /* ── Text ── */
        'text-primary':   '#FFFFFF',
        'text-secondary': 'rgba(255,255,255,0.65)',
        'text-muted':     'rgba(255,255,255,0.38)',

        /* ── Semantic aliases — keeps existing component classes working ── */
        primary:         '#ffc300',
        'primary-hover': '#ffd60a',
        secondary:       '#1e96fc',
        accent:          '#ffd60a',
        hot:             '#ffc300',
        live:            '#ffc300',
        teal:            '#ffc300',
        'teal-hover':    '#ffd60a',
        amber:           '#ffd60a',
        'golden-orange': '#ffc300',
        'deep-orange':   '#ffc300',
        'pale-sky':      '#001d3d',
        sky:             '#001d3d',
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
        card:          '0 1px 4px rgba(0,0,0,0.40)',
        'card-hover':  '0 8px 32px rgba(0,0,0,0.55)',
        'btn-primary': '0 2px 12px rgba(255,195,0,0.35)',
      },

      backgroundImage: {
        'gradient-main':    'linear-gradient(135deg, #000814 0%, #001d3d 100%)',
        'gradient-primary': 'linear-gradient(135deg, #ffc300 0%, #ffd60a 100%)',
        'gradient-amber':   'linear-gradient(135deg, #ffd60a 0%, #ffc300 100%)',
        'gradient-live':    'linear-gradient(135deg, #ffc300 0%, #ffd60a 100%)',
        'gradient-accent':  'linear-gradient(135deg, #ffd60a 0%, #ffc300 100%)',
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
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,195,0,0.55)' },
          '50%':     { boxShadow: '0 0 0 10px rgba(255,195,0,0)' },
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
