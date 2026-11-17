import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
const apply = (theme: Theme) => {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-ocean');
    document.documentElement.classList.add(`theme-${theme}`);
};
export const useThemeStore = create<{ theme: Theme; setTheme: (theme: Theme) => void }>()(persist((set) => ({
    theme: 'dark', setTheme: theme => { apply(theme); set({ theme }); },
}), { name: 'ui-theme-storage', version: 2, migrate: () => ({ theme: 'dark' }) }));

export const initializeTheme = () => {
    try {
        const saved = JSON.parse(localStorage.getItem('ui-theme-storage') || '{}');
        apply(saved.version === 2 && saved.state?.theme === 'light' ? 'light' : 'dark');
    } catch { apply('dark'); }
};
