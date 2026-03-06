import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#355773",
                "primary-soft": "#EBF1F6",
                "primary-light": "#7AAACE",
                "background-light": "#F7F8F0",
                "background-dark": "#15191d",
                "kakao": "#FEE500",
                "google": "#FFFFFF"
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"
            },
            boxShadow: {
                "sm": "0 2px 4px rgba(0,0,0,0.05)",
                "md": "0 4px 12px rgba(0,0,0,0.1)",
            }
        },
    },
    plugins: [],
}
export default config
