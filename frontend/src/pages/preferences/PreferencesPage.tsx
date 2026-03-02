import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Palette, Moon, Sun, MonitorSmartphone, MessageCircle, KeyRound, Phone, HelpCircle, Send, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';

// ─── Instructions Modal ────────────────────────────────────────────────────────
function InstructionsModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-brand-200 w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-brand-100">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <MessageCircle size={22} className="text-green-500" />
                        Cómo obtener tu API Key de CallMeBot
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                        <X size={20} className="text-[var(--text-secondary)]" />
                    </button>
                </div>
                <div className="p-6 space-y-4 text-[var(--text-secondary)]">
                    <ol className="space-y-4 list-none">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">1</span>
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Agrega el número de CallMeBot</p>
                                <p className="text-sm mt-1">Guarda este contacto en tu teléfono:</p>
                                <code className="mt-1 block text-sm bg-[var(--bg-main)] border border-brand-200 px-3 py-2 rounded-lg font-mono text-brand-700">
                                    +34 644 66 32 62
                                </code>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">2</span>
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Envía este mensaje por WhatsApp</p>
                                <code className="mt-1 block text-sm bg-[var(--bg-main)] border border-brand-200 px-3 py-2 rounded-lg font-mono text-brand-700">
                                    I allow callmebot to send me messages
                                </code>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">3</span>
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Recibirás tu API Key</p>
                                <p className="text-sm mt-1">CallMeBot te responderá con un mensaje que contiene tu clave personal. Cópiala y pégala en el campo de arriba.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">4</span>
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Ingresa tu número en formato internacional</p>
                                <p className="text-sm mt-1">Incluye el código del país sin el símbolo <code className="bg-[var(--bg-main)] px-1 rounded">+</code>. Ejemplo para México:</p>
                                <code className="mt-1 block text-sm bg-[var(--bg-main)] border border-brand-200 px-3 py-2 rounded-lg font-mono text-brand-700">
                                    5212345678901
                                </code>
                            </div>
                        </li>
                    </ol>
                </div>
                <div className="p-6 border-t border-brand-100">
                    <button
                        onClick={onClose}
                        className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function PreferencesPage() {
    const { theme, setTheme } = useThemeStore();
    const queryClient = useQueryClient();
    const [showInstructions, setShowInstructions] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // ── Remote state
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: financeService.getUserProfile,
    });

    const [localPhone, setLocalPhone] = useState<string>('');
    const [localApiKey, setLocalApiKey] = useState<string>('');
    const [localEnabled, setLocalEnabled] = useState<boolean>(false);
    const [synced, setSynced] = useState(false);

    // Sync once profile loads
    if (profile && !synced) {
        setLocalPhone(profile.whatsapp_phone || '');
        setLocalApiKey(profile.whatsapp_apikey || '');
        setLocalEnabled(profile.whatsapp_enabled);
        setSynced(true);
    }

    const saveMutation = useMutation({
        mutationFn: (data: Parameters<typeof financeService.updateUserProfile>[0]) =>
            financeService.updateUserProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        }
    });

    const handleSave = () => {
        saveMutation.mutate({
            whatsapp_phone: localPhone || null,
            whatsapp_apikey: localApiKey || null,
            whatsapp_enabled: localEnabled,
        });
    };

    const handleTest = async () => {
        // Save settings first
        try {
            await financeService.updateUserProfile({
                whatsapp_phone: localPhone || null,
                whatsapp_apikey: localApiKey || null,
                whatsapp_enabled: localEnabled,
            });
        } catch {
            // Ignore save errors - proceed with test using local values
        }

        setTestStatus('sending');
        setTestMessage('');

        // Call CallMeBot directly from the browser — no server relay needed
        try {
            const message = encodeURIComponent('✅ Conexión exitosa con tu app de finanzas. Las notificaciones de gastos fijos están activas.');
            const phone = localPhone.replace(/[^0-9]/g, ''); // strip all non-digits
            const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${message}&apikey=${localApiKey.trim()}`;

            await fetch(url, { mode: 'no-cors' });
            // no-cors always returns opaque response; if we get here, the request was sent
            setTestStatus('ok');
            setTestMessage('Solicitud enviada a CallMeBot. Deberías recibir el WhatsApp en unos segundos.');
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage('No se pudo enviar la solicitud. Verifica tu conexión a internet.');
        }
    };

    const canTest = localPhone.trim().length > 5 && localApiKey.trim().length > 3;
    const isDirty = profile && (
        localPhone !== (profile.whatsapp_phone || '') ||
        localApiKey !== (profile.whatsapp_apikey || '') ||
        localEnabled !== profile.whatsapp_enabled
    );

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

            {/* WhatsApp Notifications */}
            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <MessageCircle className="text-green-500" size={24} />
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Notificaciones WhatsApp</h2>
                    </div>
                    {/* Toggle */}
                    <button
                        disabled={profileLoading}
                        onClick={() => setLocalEnabled(!localEnabled)}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${localEnabled ? 'bg-green-500' : 'bg-[var(--bg-main)] border border-brand-200'}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${localEnabled ? 'translate-x-7' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Recibe un aviso por WhatsApp cuando un gasto fijo esté próximo a cobrar.
                    Requiere una cuenta de{' '}
                    <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="text-green-600 underline font-medium">
                        CallMeBot
                    </a>{' '}(gratis).
                </p>

                <div className={`space-y-4 transition-all duration-300 ${localEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                            <Phone size={15} /> Número de teléfono (formato internacional)
                        </label>
                        <input
                            type="text"
                            value={localPhone}
                            onChange={e => setLocalPhone(e.target.value)}
                            placeholder="5212345678901"
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Sin el símbolo +. Ejemplo MX: 5212345678901</p>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                            <KeyRound size={15} /> API Key de CallMeBot
                        </label>
                        <input
                            type="password"
                            value={localApiKey}
                            onChange={e => setLocalApiKey(e.target.value)}
                            placeholder="Tu API key..."
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                        />
                    </div>

                    {/* Info + test result */}
                    {testStatus !== 'idle' && (
                        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm border ${testStatus === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : testStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[var(--bg-main)] border-brand-200 text-[var(--text-secondary)]'}`}>
                            {testStatus === 'sending' && <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />}
                            {testStatus === 'ok' && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                            {testStatus === 'error' && <XCircle size={16} className="mt-0.5 shrink-0" />}
                            <span>{testStatus === 'sending' ? 'Enviando mensaje de prueba...' : testMessage}</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <button
                            onClick={() => setShowInstructions(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm font-medium transition-colors"
                        >
                            <HelpCircle size={16} />
                            ¿Cómo conseguir el API Key?
                        </button>

                        <button
                            onClick={handleTest}
                            disabled={!canTest || testStatus === 'sending'}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {testStatus === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Enviar mensaje de prueba
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!isDirty || saveMutation.isPending}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-900 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                        >
                            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sistema (Placeholder) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-200 opacity-60">
                <div className="flex items-center gap-3 mb-6">
                    <MonitorSmartphone className="text-brand-700" size={24} />
                    <h2 className="text-xl font-semibold">Sistema y Visualización</h2>
                </div>
                <p className="text-sm italic">Próximamente: Reglas de redondeo, moneda por defecto e idioma.</p>
            </div>

            {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
        </div>
    );
}
