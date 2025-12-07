// Document type themes for consistent styling across the app
export const documentThemes = {
  counterparties: {
    name: 'Контрагенти',
    primary: '#0d9488',      // teal-600
    light: '#5eead4',        // teal-300
    lighter: '#ccfbf1',      // teal-100
    dark: '#115e59',         // teal-800
    gradient: 'from-teal-500 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    border: 'border-teal-200',
    text: 'text-teal-900',
    hover: 'hover:bg-teal-50',
    icon: '👥'
  },
  orders: {
    name: 'Замовлення',
    primary: '#2563eb',      // blue-600
    light: '#60a5fa',        // blue-400
    lighter: '#dbeafe',      // blue-100
    dark: '#1e40af',         // blue-800
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    hover: 'hover:bg-blue-50',
    icon: '📋'
  },
  invoices: {
    name: 'Рахунки',
    primary: '#059669',      // emerald-600
    light: '#34d399',        // emerald-400
    lighter: '#d1fae5',      // emerald-100
    dark: '#065f46',         // emerald-800
    gradient: 'from-emerald-500 to-green-600',
    bgGradient: 'from-emerald-50 to-green-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    hover: 'hover:bg-emerald-50',
    icon: '💰'
  },
  acts: {
    name: 'Акти',
    primary: '#9333ea',      // purple-600
    light: '#c084fc',        // purple-400
    lighter: '#f3e8ff',      // purple-100
    dark: '#6b21a8',         // purple-800
    gradient: 'from-purple-500 to-fuchsia-600',
    bgGradient: 'from-purple-50 to-fuchsia-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    hover: 'hover:bg-purple-50',
    icon: '✅'
  },
  waybills: {
    name: 'Накладні',
    primary: '#ea580c',      // orange-600
    light: '#fb923c',        // orange-400
    lighter: '#ffedd5',      // orange-100
    dark: '#c2410c',         // orange-800
    gradient: 'from-orange-500 to-amber-600',
    bgGradient: 'from-orange-50 to-amber-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    hover: 'hover:bg-orange-50',
    icon: '📦'
  },
  contracts: {
    name: 'Договори',
    primary: '#4f46e5',      // indigo-600
    light: '#818cf8',        // indigo-400
    lighter: '#e0e7ff',      // indigo-100
    dark: '#3730a3',         // indigo-800
    gradient: 'from-indigo-500 to-violet-600',
    bgGradient: 'from-indigo-50 to-violet-50',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    hover: 'hover:bg-indigo-50',
    icon: '📜'
  }
};

// Helper function to get theme by type
export const getTheme = (type) => {
  return documentThemes[type] || documentThemes.orders;
};
