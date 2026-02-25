import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
    return (
        <div className="flex h-screen bg-brand-50 font-sans text-gray-900">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto w-full">
                <Outlet />
            </main>
        </div>
    );
}
