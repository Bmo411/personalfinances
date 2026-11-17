import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu, X, Sun, Wallet, FolderKanban, Dumbbell } from 'lucide-react';
import { Capture } from '../components/guide/Capture';

const financePaths = ['/finance', '/financial-life', '/accounts', '/credit-cards', '/recurring', '/savings', '/debts', '/history', '/categories', '/imports'];
const financeTabs = [['/finance', 'Resumen'], ['/history', 'Movimientos'], ['/accounts', 'Cuentas'], ['/credit-cards', 'Tarjetas'], ['/recurring', 'Fijos'], ['/savings', 'Ahorros'], ['/debts', 'Deudas'], ['/categories', 'Categorías'], ['/financial-life', 'Metas'], ['/imports', 'Importar']];

export function MainLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { pathname } = useLocation();
    return <div className="app-shell"><a className="skip-link" href="#main">Ir al contenido</a><Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        {menuOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
        <div className="app-content"><header className="app-topbar"><button className="icon-button mobile-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button><span className="topbar-title">Mi guía de vida</span><Capture /></header>
            <main id="main" className="main-content">{financePaths.includes(pathname) && <nav className="tabs finance-tabs" aria-label="Finanzas">{financeTabs.map(([path, label]) => <NavLink key={path} className={({ isActive }) => isActive ? 'active' : ''} to={path}>{label}</NavLink>)}</nav>}<Outlet /></main>
        </div>
        <nav className="bottom-nav" aria-label="Accesos rápidos">{[{ path: '/', label: 'Hoy', icon: Sun }, { path: '/finance', label: 'Finanzas', icon: Wallet }, { path: '/organization', label: 'Organización', icon: FolderKanban }, { path: '/health', label: 'Salud', icon: Dumbbell }].map(item => <NavLink key={item.path} end={item.path === '/'} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}><item.icon size={19} />{item.label}</NavLink>)}</nav>
    </div>;
}
