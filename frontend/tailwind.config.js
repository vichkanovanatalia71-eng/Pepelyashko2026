/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  safelist: [
    // Teal/Cyan (Counterparties)
    'bg-teal-50', 'bg-teal-100', 'bg-teal-500', 'bg-teal-600', 'border-teal-200', 'border-teal-300', 'text-teal-900', 'text-teal-600', 'hover:bg-teal-50', 'hover:border-teal-400',
    'bg-cyan-50', 'bg-cyan-100', 'border-cyan-200', 'from-teal-50', 'via-cyan-50', 'to-teal-50', 'from-teal-500', 'to-cyan-600',
    'from-teal-600', 'to-cyan-700', 'shadow-teal-200/50',
    // Blue/Sky (Orders)
    'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-blue-600', 'border-blue-200', 'border-blue-300', 'text-blue-900', 'text-blue-600', 'hover:bg-blue-50', 'hover:border-blue-400',
    'bg-sky-50', 'bg-sky-100', 'from-blue-50', 'via-sky-50', 'to-blue-50', 'from-blue-500', 'to-sky-600',
    'from-blue-600', 'to-sky-700', 'shadow-blue-200/50',
    // Green/Emerald (Invoices)
    'bg-green-50', 'bg-green-100', 'bg-green-500', 'bg-green-600', 'border-green-200', 'border-green-300', 'text-green-900', 'text-green-600', 'hover:bg-green-50', 'hover:border-green-400',
    'bg-emerald-50', 'bg-emerald-100', 'border-emerald-200', 'from-green-50', 'via-emerald-50', 'to-green-50', 'from-green-500', 'to-emerald-600',
    'from-green-600', 'to-emerald-700', 'shadow-green-200/50',
    // Purple/Violet (Acts)
    'bg-purple-50', 'bg-purple-100', 'bg-purple-500', 'bg-purple-600', 'border-purple-200', 'border-purple-300', 'text-purple-900', 'text-purple-600', 'hover:bg-purple-50', 'hover:border-purple-400',
    'bg-violet-50', 'bg-violet-100', 'border-violet-200', 'from-purple-50', 'via-violet-50', 'to-purple-50', 'from-purple-500', 'to-violet-600',
    'from-purple-600', 'to-violet-700', 'shadow-purple-200/50',
    // Orange/Amber (Waybills)
    'bg-orange-50', 'bg-orange-100', 'bg-orange-500', 'bg-orange-600', 'border-orange-200', 'border-orange-300', 'text-orange-900', 'text-orange-600', 'hover:bg-orange-50', 'hover:border-orange-400',
    'bg-amber-50', 'bg-amber-100', 'border-amber-200', 'from-orange-50', 'via-amber-50', 'to-orange-50', 'from-orange-500', 'to-amber-600',
    'from-orange-600', 'to-amber-700', 'shadow-orange-200/50',
    // Rose/Pink (Contracts - UNIQUE!)
    'bg-rose-50', 'bg-rose-100', 'bg-rose-500', 'bg-rose-600', 'border-rose-200', 'border-rose-300', 'text-rose-900', 'text-rose-600', 'hover:bg-rose-50', 'hover:border-rose-400',
    'bg-pink-50', 'bg-pink-100', 'border-pink-200', 'from-rose-50', 'via-pink-50', 'to-rose-50', 'from-rose-500', 'to-pink-600',
    'from-rose-600', 'to-pink-700', 'shadow-rose-200/50',
    // Additional
    'bg-gradient-to-br', 'bg-gradient-to-r', 'hover:scale-105'
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};