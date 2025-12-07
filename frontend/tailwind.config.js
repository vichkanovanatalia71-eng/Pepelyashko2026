/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  safelist: [
    // Greens
    'bg-green-50', 'bg-green-100', 'border-green-200', 'text-green-900',
    'bg-emerald-50', 'bg-emerald-100', 'border-emerald-200', 'text-emerald-900',
    // Purples
    'bg-purple-50', 'bg-purple-100', 'border-purple-200', 'text-purple-900',
    'bg-fuchsia-50', 'bg-fuchsia-100', 'border-fuchsia-200', 'text-fuchsia-900',
    // Oranges
    'bg-orange-50', 'bg-orange-100', 'border-orange-200', 'text-orange-900',
    'bg-amber-50', 'bg-amber-100', 'border-amber-200', 'text-amber-900',
    // Blues
    'bg-blue-50', 'bg-blue-100', 'border-blue-200', 'text-blue-900',
    'bg-indigo-50', 'bg-indigo-100', 'border-indigo-200', 'text-indigo-900',
    // Teals
    'bg-teal-50', 'bg-teal-100', 'border-teal-200', 'text-teal-900',
    'bg-cyan-50', 'bg-cyan-100', 'border-cyan-200', 'text-cyan-900',
    // Violets
    'bg-violet-50', 'bg-violet-100', 'border-violet-200', 'text-violet-900',
    // Gradients
    'from-teal-500', 'to-cyan-600', 'from-blue-500', 'to-indigo-600',
    'from-emerald-500', 'to-green-600', 'from-purple-500', 'to-fuchsia-600',
    'from-orange-500', 'to-amber-600', 'from-indigo-500', 'to-violet-600',
    // Backgrounds
    'from-teal-50', 'to-cyan-50', 'from-blue-50', 'to-indigo-50',
    'from-emerald-50', 'to-green-50', 'from-purple-50', 'to-fuchsia-50',
    'from-orange-50', 'to-amber-50', 'from-indigo-50', 'to-violet-50'
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