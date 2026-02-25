import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Wallet2, LayoutDashboard, History, PiggyBank, LogOut, Settings, Target, Users, CalendarClock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper temporal
export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Wallet2, label: 'Cuentas', path: '/accounts' },
    { icon: CalendarClock, label: 'Gastos Fijos', path: '/recurring' },
    { icon: History, label: 'Historial', path: '/history' },
    { icon: PiggyBank, label: 'Categorías', path: '/categories' },
    { icon: Target, label: 'Ahorros', path: '/savings' },
    { icon: Users, label: 'Deudas', path: '/debts' },
    { icon: Settings, label: 'Preferencias', path: '/preferences' },
];

export function Sidebar() {
    const location = useLocation();
    const logout = useAuthStore(state => state.logout);

    return (
        <aside className="w-64 bg-[var(--bg-secondary)] border-r border-brand-200 h-screen flex flex-col fixed left-0 top-0 transition-colors duration-300">
            <div className="p-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Wallet2 className="text-brand-700" size={28} />
                    FinanceFlow
                </h1>
            </div>

            <nav className="flex-1 px-4 mt-6 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                                isActive
                                    ? "bg-brand-500 text-white shadow-sm"
                                    : "text-brand-700 hover:bg-[var(--bg-hover)] hover:text-brand-900"
                            )}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-brand-200">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium w-full text-brand-700 hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut size={20} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
