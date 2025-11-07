// Configuration Tailwind CSS pour le générateur de workflow interactif

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        workflow: {
          start: '#10b981',
          process: '#3b82f6',
          decision: '#f59e0b',
          approval: '#8b5cf6',
          end: '#ef4444',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}