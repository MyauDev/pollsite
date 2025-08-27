import type { Config } from 'tailwindcss';


export default {
content: [
'./app/**/*.{ts,tsx}',
'./components/**/*.{ts,tsx}',
],
theme: {
extend: {
colors: {
card: '#111318',
accent: '#5B9DFF',
}
},
},
plugins: [],
} satisfies Config;