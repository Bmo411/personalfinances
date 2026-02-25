import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet2, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const setTokens = useAuthStore(state => state.setTokens);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('auth/login/', { username, password });
            setTokens(response.data.access, response.data.refresh);
            navigate('/');
        } catch (err: unknown) {
            setError('Credenciales incorrectas o problema de conexión.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-50 font-sans p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-brand-200">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-brand-200 rounded-2xl flex items-center justify-center mb-4">
                        <Wallet2 size={32} className="text-brand-900" />
                    </div>
                    <h1 className="text-3xl font-bold text-brand-900 text-center">Bienvenido de vuelta</h1>
                    <p className="text-brand-700 mt-2 text-center">Ingresa a tu cuenta para continuar</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-900 mb-2">Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50 text-brand-900 transition-all placeholder:text-brand-400"
                            placeholder="Ej: tu_usuario"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-900 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50 text-brand-900 transition-all placeholder:text-brand-400"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
