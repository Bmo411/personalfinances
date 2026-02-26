import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('auth/register/', { username, email, password });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al crear la cuenta. Intente con otro usuario.');
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
                    <h1 className="text-3xl font-bold text-brand-900 text-center">Crear Cuenta</h1>
                    <p className="text-brand-700 mt-2 text-center">Empieza a controlar tus finanzas</p>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
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
                        <label className="block text-sm font-medium text-brand-900 mb-2">Correo Electrónico</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-brand-50 text-brand-900 transition-all placeholder:text-brand-400"
                            placeholder="tucorreo@ejemplo.com"
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
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Registrarse'}
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-brand-700">
                            ¿Ya tienes una cuenta?{' '}
                            <Link to="/login" className="text-brand-900 font-bold hover:underline">
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
