import { useThemeStore } from '../../store/themeStore';
import { Palette, Moon, Sun, MonitorSmartphone } from 'lucide-react';

export function PreferencesPage() {
    const { theme, setTheme } = useThemeStore();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Preferencias</h1>

            {/* Tema de Interfaz */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-200">
                <div className="flex items-center gap-3 mb-6">
                    <Palette className="text-brand-700" size={24} />
                    <h2 className="text-xl font-semibold">Tema y Pantalla</h2>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-brand-900/60 mb-4">
                        Personaliza los colores de la aplicación.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Verde Pastel Default */}
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'light' ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-gray-200 hover:border-brand-400'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex border border-gray-200 shadow-sm">
                                <div className="w-1/2 h-full bg-[#E9F5DB]"></div>
                                <div className="w-1/2 h-full bg-[#718355]"></div>
                            </div>
                            <span className="font-medium">Original (Verde)</span>
                            <div className="flex bg-gray-100 rounded-full px-2 py-1 text-xs gap-1 mt-1">
                                <Sun size={14} className="text-yellow-600" /> Claro
                            </div>
                        </button>

                        {/* Océano */}
                        <button
                            onClick={() => setTheme('ocean')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'ocean' ? 'border-[#38bdf8] bg-[#e0f2fe] shadow-md' : 'border-gray-200 hover:border-[#7dd3fc]'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex border border-gray-200 shadow-sm">
                                <div className="w-1/2 h-full bg-[#e0f2fe]"></div>
                                <div className="w-1/2 h-full bg-[#0c4a6e]"></div>
                            </div>
                            <span className="font-medium">Océano</span>
                            <div className="flex bg-gray-100 rounded-full px-2 py-1 text-xs gap-1 mt-1">
                                <Sun size={14} className="text-yellow-600" /> Claro
                            </div>
                        </button>

                        {/* Oscuro */}
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'dark' ? 'border-[#71a367] bg-[#1a2318] shadow-md text-white' : 'border-gray-200 hover:border-[#598051]'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex border border-gray-200 shadow-sm">
                                <div className="w-1/2 h-full bg-[#121212]"></div>
                                <div className="w-1/2 h-full bg-[#71a367]"></div>
                            </div>
                            <span className="font-medium">Oscuro</span>
                            <div className="flex bg-gray-100 rounded-full px-2 py-1 text-xs gap-1 mt-1">
                                <Moon size={14} className="text-blue-400" /> Oscuro
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Configuración de Moneda o Regional Placeholder */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-200 opacity-60">
                <div className="flex items-center gap-3 mb-6">
                    <MonitorSmartphone className="text-brand-700" size={24} />
                    <h2 className="text-xl font-semibold">Sistema y Visualización</h2>
                </div>
                <p className="text-sm italic">Próximamente: Reglas de redondeo, moneda por defecto e idioma.</p>
            </div>
        </div>
    );
}
