/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',     // Extra small devices
        'sm': '640px',     // Small devices
        'md': '768px',     // Medium devices
        'lg': '1024px',    // Large devices
        'xl': '1280px',    // Extra large devices
        '2xl': '1536px',   // 2X large devices
      },
      fontSize: {
        'xs': '0.75rem',   // Extra small text
        'sm': '0.875rem',  // Small text
        'base': '1rem',    // Base text
        'lg': '1.125rem',  // Large text
        'xl': '1.25rem',   // Extra large text
        '2xl': '1.5rem',   // 2X large text
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        'mobile': '1rem',  // Larger rounded corners for mobile
      }
    },
  },
  plugins: [
    function({ addBase, theme }) {
      addBase({
        'html': { 
          fontSize: '16px',
          '@media (max-width: 640px)': {
            fontSize: '14px'
          }
        }
      })
    }
  ],
}
