import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'ocean';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            setTheme: (theme) => {
                const root = window.document.documentElement;

                // Remove existing theme classes
                root.classList.remove('theme-dark', 'theme-ocean');

                // Add new theme class if not default (light)
                if (theme !== 'light') {
                    root.classList.add(`theme-${theme}`);
                }

                set({ theme });
            },
        }),
        {
            name: 'ui-theme-storage',
        }
    )
);

// Helper script to inject on page load to prevent flash of wrong theme
export const initializeTheme = () => {
    const rawData = localStorage.getItem('ui-theme-storage');
    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            const theme = parsed.state.theme;

            const root = window.document.documentElement;
            root.classList.remove('theme-dark', 'theme-ocean');

            if (theme !== 'light') {
                root.classList.add(`theme-${theme}`);
            }
        } catch (e) {
            console.error('Error parsing theme state', e);
        }
    }
};
