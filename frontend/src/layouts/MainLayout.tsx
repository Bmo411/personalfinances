import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MainLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[var(--bg-main)] font-sans text-[var(--text-primary)]">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-b border-brand-200 z-50 flex items-center justify-between px-4 text-brand-700 font-bold">
                FinanceFlow
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[var(--text-secondary)]">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <main className="flex-1 w-full pt-28 md:pt-8 md:pl-64 p-4 md:p-8 overflow-y-auto">
                <Outlet />
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
