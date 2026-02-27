import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { PlusCircle, Wallet, Loader2, CreditCard, Landmark, Target } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export function AccountsPage() {
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: financeService.getAccounts
    });

    // We also want to fetch the summary to get the calculated real-time balances
    const { data: summary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    // Merge database accounts with their running calculated balances from the backend summary
    const enrichedAccounts = accounts.map(acc => {
        const summaryMatch = summary?.accounts?.find((s: any) => s.id === acc.id);
        return {
            ...acc,
            calculated_balance: summaryMatch?.calculated_balance ?? acc.balance
        };
    });

    const totalCash = enrichedAccounts.filter(a => a.type === 'CASH').reduce((sum, a) => sum + Number(a.calculated_balance), 0);
    const totalBank = enrichedAccounts.filter(a => a.type === 'DEBIT').reduce((sum, a) => sum + Number(a.calculated_balance), 0);
    const totalCredit = enrichedAccounts.filter(a => a.type === 'CREDIT').reduce((sum, a) => sum + Number(a.calculated_balance), 0);
    const totalSavings = enrichedAccounts.filter(a => a.type === 'SAVINGS').reduce((sum, a) => sum + Number(a.calculated_balance), 0);

    // Net total (Cash + Bank + Savings - Credit obligations)
    const netTotal = totalCash + totalBank + totalSavings - totalCredit;

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Cuentas y Carteras</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Conoce exactamente dónde está tu dinero</p>
                </div>

                <button
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                    <PlusCircle size={20} />
                    Agregar Cuenta
                </button>
            </header>

            {/* General Overview */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <div className="md:col-span-2 bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                    <h2 className="text-brand-100 font-medium mb-1">Patrimonio Líquido</h2>
                    <p className="text-4xl font-bold">
                        ${netTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium mb-2 text-sm">
                        <Landmark size={18} /> Bancos
                    </div>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                        ${totalBank.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium mb-2 text-sm">
                        <Wallet size={18} /> Efectivo
                    </div>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                        ${totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium mb-2 text-sm">
                        <Loader2 size={18} /> Inversiones
                    </div>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                        ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* List of accounts */}
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Tus Cuentas Activas</h2>

            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando cuentas...</div>
            ) : enrichedAccounts.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <Landmark size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin cuentas configuradas</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Crea tu primera cuenta bancaria o cartera física para empezar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enrichedAccounts.map(account => {
                        const Icon = account.type === 'CASH' ? Wallet : (account.type === 'CREDIT' ? CreditCard : (account.type === 'SAVINGS' ? Target : Landmark));

                        return (
                            <div key={account.id} className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 relative overflow-hidden group hover:border-brand-400 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-brand-50 rounded-xl" style={{ color: account.color || '#97A97C' }}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                            {account.type === 'CASH' ? 'Efectivo' : (account.type === 'CREDIT' ? 'Crédito' : (account.type === 'SAVINGS' ? 'Ahorro / Inversión' : 'Débito/Banco'))}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg text-[var(--text-primary)]">{account.name}</h3>

                                <div className="mt-4 pt-4 border-t border-brand-100 flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">Balance Actual</p>
                                        <p className={`text-2xl font-bold ${account.type === 'CREDIT' ? 'text-red-500' : 'text-brand-700'}`}>
                                            ${Number(account.calculated_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} title="Agregar Cuenta / Billetera">
                <CreateAccountForm onSuccess={() => setIsAddAccountModalOpen(false)} />
            </Modal>
        </div>
    );
}

function CreateAccountForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'CASH' | 'DEBIT' | 'CREDIT'>('DEBIT');
    const [balance, setBalance] = useState('');
    const [color, setColor] = useState('#0ea5e9'); // Default blueish

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: financeService.createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        },
        onError: (error: any) => {
            console.error("Error creating account:", error.response?.data || error.message);
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data)
                : "Error de conexión o validación al crear cuenta.";
            alert(`No se pudo crear: ${errorMsg}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ name, type, balance: balance || '0', color });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre de Cuenta</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Ej: BBVA Libre, Billetera de Piel..."
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipo de Instrumento</label>
                <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                    <option value="DEBIT">Cuenta Bancaria / Tarjeta de Débito</option>
                    <option value="CASH">Efectivo / Cartera / Caja Fuerte</option>
                    <option value="SAVINGS">Cuenta de Ahorro / Inversión</option>
                    <option value="CREDIT">Tarjeta de Crédito</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Saldo Base Inicial ($) <span className="text-xs opacity-70">(Opcional)</span>
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pintar icono de color:</label>
                <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer"
                />
            </div>

            <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full mt-4 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Crear Cuenta'}
            </button>
        </form>
    );
}
