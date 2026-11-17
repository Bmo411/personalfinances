import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sun, Wallet, CalendarDays, FolderKanban, GraduationCap, Dumbbell, Flower2, Settings, Plug, LogOut, ArrowUpRight } from 'lucide-react';

const navigation = [
    { icon: Sun, label: 'Hoy', path: '/' },
    { icon: Wallet, label: 'Finanzas', path: '/finance' },
    { icon: FolderKanban, label: 'Organización', path: '/organization' },
    { icon: CalendarDays, label: 'Mi mes', path: '/month' },
    { icon: GraduationCap, label: 'Clases', path: '/math' },
    { icon: Dumbbell, label: 'Gym y dieta', path: '/health' },
    { icon: Flower2, label: 'Meditación', path: '/meditation' },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const logout = useAuthStore(state => state.logout);
    return <aside className={`guide-sidebar ${isOpen ? 'is-open' : ''}`}>
        <NavLink className="guide-brand" to="/" onClick={onClose}><span><Sun size={25} strokeWidth={1.4} /></span><div>Mi guía<small>VIDA EN PERSPECTIVA</small></div></NavLink>
        <nav aria-label="Navegación principal">{navigation.map(item => <NavLink key={item.path} end={item.path === '/'} to={item.path} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}><item.icon size={19} strokeWidth={1.6} />{item.label}</NavLink>)}</nav>
        <div className="sidebar-footer"><NavLink className="nav-item" to="/integrations" onClick={onClose}><Plug size={18} />Integraciones<ArrowUpRight size={14} className="ml-auto" /></NavLink><NavLink className="nav-item" to="/preferences" onClick={onClose}><Settings size={18} />Preferencias</NavLink><button className="nav-item w-full" onClick={logout}><LogOut size={18} />Cerrar sesión</button></div>
    </aside>;
}
