// Document type themes for consistent styling across the app
// Each tab has a UNIQUE color - no duplicates!
export const documentThemes = {
  counterparties: {
    name: 'Контрагенти',
    primary: '#0d9488',      // teal-600
    light: '#5eead4',        // teal-300
    lighter: '#ccfbf1',      // teal-100
    lightest: '#f0fdfa',     // teal-50
    dark: '#115e59',         // teal-800
    darker: '#134e4a',       // teal-900
    gradient: 'from-teal-500 to-cyan-600',
    gradientHover: 'from-teal-600 to-cyan-700',
    bgGradient: 'from-teal-50 via-cyan-50 to-teal-50',
    cardBg: 'bg-gradient-to-br from-teal-50 to-cyan-100',
    cardBorder: 'border-teal-300',
    border: 'border-teal-200',
    text: 'text-teal-900',
    textLight: 'text-teal-600',
    hover: 'hover:bg-teal-50',
    hoverBorder: 'hover:border-teal-400',
    focus: 'focus:ring-teal-500',
    buttonBg: 'bg-teal-500',
    buttonHover: 'hover:bg-teal-600',
    icon: '👥',
    shadow: 'shadow-teal-200/50'
  },
  orders: {
    name: 'Замовлення',
    primary: '#2563eb',      // blue-600
    light: '#60a5fa',        // blue-400
    lighter: '#dbeafe',      // blue-100
    lightest: '#eff6ff',     // blue-50
    dark: '#1e40af',         // blue-800
    darker: '#1e3a8a',       // blue-900
    gradient: 'from-blue-500 to-sky-600',
    gradientHover: 'from-blue-600 to-sky-700',
    bgGradient: 'from-blue-50 via-sky-50 to-blue-50',
    cardBg: 'bg-gradient-to-br from-blue-50 to-sky-100',
    cardBorder: 'border-blue-300',
    border: 'border-blue-200',
    text: 'text-blue-900',
    textLight: 'text-blue-600',
    hover: 'hover:bg-blue-50',
    hoverBorder: 'hover:border-blue-400',
    focus: 'focus:ring-blue-500',
    buttonBg: 'bg-blue-500',
    buttonHover: 'hover:bg-blue-600',
    icon: '📋',
    shadow: 'shadow-blue-200/50'
  },
  invoices: {
    name: 'Рахунки',
    primary: '#16a34a',      // green-600
    light: '#4ade80',        // green-400
    lighter: '#dcfce7',      // green-100
    lightest: '#f0fdf4',     // green-50
    dark: '#15803d',         // green-700
    darker: '#166534',       // green-800
    gradient: 'from-green-500 to-emerald-600',
    gradientHover: 'from-green-600 to-emerald-700',
    bgGradient: 'from-green-50 via-emerald-50 to-green-50',
    cardBg: 'bg-gradient-to-br from-green-50 to-emerald-100',
    cardBorder: 'border-green-300',
    border: 'border-green-200',
    text: 'text-green-900',
    textLight: 'text-green-600',
    hover: 'hover:bg-green-50',
    hoverBorder: 'hover:border-green-400',
    focus: 'focus:ring-green-500',
    buttonBg: 'bg-green-500',
    buttonHover: 'hover:bg-green-600',
    icon: '💰',
    shadow: 'shadow-green-200/50'
  },
  acts: {
    name: 'Акти',
    primary: '#9333ea',      // purple-600
    light: '#c084fc',        // purple-400
    lighter: '#f3e8ff',      // purple-100
    lightest: '#faf5ff',     // purple-50
    dark: '#7e22ce',         // purple-700
    darker: '#6b21a8',       // purple-800
    gradient: 'from-purple-500 to-violet-600',
    gradientHover: 'from-purple-600 to-violet-700',
    bgGradient: 'from-purple-50 via-violet-50 to-purple-50',
    cardBg: 'bg-gradient-to-br from-purple-50 to-violet-100',
    cardBorder: 'border-purple-300',
    border: 'border-purple-200',
    text: 'text-purple-900',
    textLight: 'text-purple-600',
    hover: 'hover:bg-purple-50',
    hoverBorder: 'hover:border-purple-400',
    focus: 'focus:ring-purple-500',
    buttonBg: 'bg-purple-500',
    buttonHover: 'hover:bg-purple-600',
    icon: '✅',
    shadow: 'shadow-purple-200/50'
  },
  waybills: {
    name: 'Накладні',
    primary: '#ea580c',      // orange-600
    light: '#fb923c',        // orange-400
    lighter: '#fed7aa',      // orange-200
    lightest: '#fff7ed',     // orange-50
    dark: '#c2410c',         // orange-700
    darker: '#9a3412',       // orange-800
    gradient: 'from-orange-500 to-amber-600',
    gradientHover: 'from-orange-600 to-amber-700',
    bgGradient: 'from-orange-50 via-amber-50 to-orange-50',
    cardBg: 'bg-gradient-to-br from-orange-50 to-amber-100',
    cardBorder: 'border-orange-300',
    border: 'border-orange-200',
    text: 'text-orange-900',
    textLight: 'text-orange-600',
    hover: 'hover:bg-orange-50',
    hoverBorder: 'hover:border-orange-400',
    focus: 'focus:ring-orange-500',
    buttonBg: 'bg-orange-500',
    buttonHover: 'hover:bg-orange-600',
    icon: '📦',
    shadow: 'shadow-orange-200/50'
  },
  contracts: {
    name: 'Договори',
    primary: '#e11d48',      // rose-600 - UNIQUE COLOR!
    light: '#fb7185',        // rose-400
    lighter: '#fecdd3',      // rose-200
    lightest: '#fff1f2',     // rose-50
    dark: '#be123c',         // rose-700
    darker: '#9f1239',       // rose-800
    gradient: 'from-rose-500 to-pink-600',
    gradientHover: 'from-rose-600 to-pink-700',
    bgGradient: 'from-rose-50 via-pink-50 to-rose-50',
    cardBg: 'bg-gradient-to-br from-rose-50 to-pink-100',
    cardBorder: 'border-rose-300',
    border: 'border-rose-200',
    text: 'text-rose-900',
    textLight: 'text-rose-600',
    hover: 'hover:bg-rose-50',
    hoverBorder: 'hover:border-rose-400',
    focus: 'focus:ring-rose-500',
    buttonBg: 'bg-rose-500',
    buttonHover: 'hover:bg-rose-600',
    icon: '📜',
    shadow: 'shadow-rose-200/50'
  }
};

// Helper function to get theme by type
export const getTheme = (type) => {
  return documentThemes[type] || documentThemes.orders;
};
