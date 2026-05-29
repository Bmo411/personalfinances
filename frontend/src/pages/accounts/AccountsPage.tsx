import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Account, financeService } from '../../services/finance';
import { PlusCircle, Wallet, Loader2, CreditCard, Landmark, Target, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

type EnrichedAccount = Account & { calculated_balance: number };

function getErrorMessage(error: unknown, fallback: string) {
    const candidate = error as { response?: { data?: unknown }; message?: string };
    if (candidate.response?.data) {
        return JSON.stringify(candidate.response.data);
    }
    return candidate.message || fallback;
}

export function AccountsPage() {
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [reconcilingAccount, setReconcilingAccount] = useState<EnrichedAccount | null>(null);

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
        const summaryMatch = summary?.accounts?.find((s) => s.id === acc.id);
        return {
            ...acc,
            calculated_balance: Number(summaryMatch?.calculated_balance ?? acc.balance)
        };
    });

    const totalCash = enrichedAccounts.filter(a => a.type === 'CASH').reduce((sum, a) => sum + Number(a.calculated_balance), 0);
    const totalBank = enrichedAccounts.filter(a => a.type === 'DEBIT').reduce((sum, a) => sum + Number(a.calculated_balance), 0);
    const totalCreditDebt = enrichedAccounts.filter(a => a.type === 'CREDIT').reduce((sum, a) => sum + Math.max(0, -Number(a.calculated_balance)), 0);
    const totalSavings = enrichedAccounts.filter(a => a.type === 'SAVINGS').reduce((sum, a) => sum + Number(a.calculated_balance), 0);

    const liquidTotal = Number(summary?.liquid_balance ?? totalCash + totalBank);
    const netTotal = Number(summary?.net_worth ?? enrichedAccounts.reduce((sum, a) => sum + Number(a.calculated_balance), 0));

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
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-7 gap-6 mb-8">
                <div className="md:col-span-2 bg-gradient-to-r from-brand-700 to-brand-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                    <h2 className="text-brand-100 font-medium mb-1">Liquidez disponible</h2>
                    <p className="text-4xl font-bold">
                        ${liquidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium mb-2 text-sm">
                        <Wallet size={18} /> Patrimonio neto
                    </div>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
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

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] font-medium mb-2 text-sm">
                        <CreditCard size={18} /> Tarjetas
                    </div>
                    <p className="text-xl font-bold text-red-500">
                        ${totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                        const isCredit = account.type === 'CREDIT';
                        const signedBalance = Number(account.calculated_balance);
                        const creditDebt = Math.max(0, -signedBalance);
                        const creditLimit = Number(account.credit_limit || 0);
                        const availableCredit = Math.max(0, creditLimit - creditDebt);
                        const displayBalance = isCredit ? creditDebt : signedBalance;

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
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">{isCredit ? 'Deuda Actual' : 'Balance Actual'}</p>
                                        <p className={`text-2xl font-bold ${isCredit ? 'text-red-500' : 'text-brand-700'}`}>
                                            ${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                        {isCredit && creditLimit > 0 && (
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                Disponible: ${availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setReconcilingAccount(account)}
                                        className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5"
                                        title="Sincronizar saldo real"
                                    >
                                        <CheckCircle2 size={14} />
                                        {isCredit ? 'Ajustar Deuda' : 'Ajustar Saldo'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} title="Agregar Cuenta / Billetera">
                <CreateAccountForm onSuccess={() => setIsAddAccountModalOpen(false)} />
            </Modal>

            <Modal
                isOpen={!!reconcilingAccount}
                onClose={() => setReconcilingAccount(null)}
                title={`Ajustar Saldo: ${reconcilingAccount?.name}`}
            >
                {reconcilingAccount && (
                    <ReconcileAccountForm
                        account={reconcilingAccount}
                        onSuccess={() => setReconcilingAccount(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

function ReconcileAccountForm({ account, onSuccess }: { account: EnrichedAccount, onSuccess: () => void }) {
    const isCredit = account.type === 'CREDIT';
    const initialBalance = isCredit
        ? Math.max(0, -Number(account.calculated_balance)).toString()
        : account.calculated_balance?.toString() || '';
    const [actualBalance, setActualBalance] = useState(initialBalance);
    const [notes, setNotes] = useState('');

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ id, balance, notes }: { id: number, balance: number, notes: string }) =>
            financeService.reconcileAccount(id, balance, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            onSuccess();
        },
        onError: (error: unknown) => {
            console.error("Error reconciling account:", error);
            alert("No se pudo ajustar el saldo.");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(actualBalance);
        if (isNaN(balance)) return;
        mutation.mutate({ id: account.id, balance: isCredit ? -Math.abs(balance) : balance, notes });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {isCredit ? 'Cuanto debes realmente en esta tarjeta?' : 'Cuanto dinero tienes realmente en esta cuenta?'}
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={actualBalance}
                        onChange={e => setActualBalance(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] text-xl font-bold"
                        placeholder="0.00"
                        required
                        autoFocus
                    />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                    {isCredit
                        ? 'Se creara un ajuste para que la deuda de la tarjeta coincida con este monto.'
                        : 'Se creara un movimiento de ajuste automatico para igualar este monto.'}
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Notas / Recordatorio (Opcional)
                </label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="¿Por qué hay una diferencia? (ej: olvidé anotar un café, propinas, error de cálculo...)"
                    rows={3}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 px-4 py-3 rounded-xl border border-brand-200 text-[var(--text-primary)] font-medium hover:bg-brand-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-[2] bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2"
                >
                    {mutation.isPending ? <Loader2 className="animate-spin" /> : (
                        <>
                            <CheckCircle2 size={18} />
                            Confirmar Ajuste
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

function CreateAccountForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [type, setType] = useState<Account['type']>('DEBIT');
    const [balance, setBalance] = useState('');
    const [creditLimit, setCreditLimit] = useState('');
    const [statementCutDay, setStatementCutDay] = useState('');
    const [paymentDueDay, setPaymentDueDay] = useState('');
    const [color, setColor] = useState('#0ea5e9'); // Default blueish

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: financeService.createAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        },
        onError: (error: unknown) => {
            console.error("Error creating account:", error);
            alert(`No se pudo crear: ${getErrorMessage(error, 'Error de conexion o validacion al crear cuenta.')}`);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedBalance = type === 'CREDIT' && balance
            ? (-Math.abs(Number(balance))).toFixed(2)
            : balance || '0';

        mutation.mutate({
            name,
            type,
            balance: normalizedBalance,
            color,
            credit_limit: creditLimit || '0',
            statement_cut_day: statementCutDay ? Number(statementCutDay) : null,
            payment_due_day: paymentDueDay ? Number(paymentDueDay) : null,
        });
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
                    onChange={e => setType(e.target.value as Account['type'])}
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
                    {type === 'CREDIT' ? 'Deuda inicial ($)' : 'Saldo Base Inicial ($)'} <span className="text-xs opacity-70">(Opcional)</span>
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

            {type === 'CREDIT' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Limite</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={creditLimit}
                            onChange={e => setCreditLimit(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Corte</label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={statementCutDay}
                            onChange={e => setStatementCutDay(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                            placeholder="15"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pago</label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={paymentDueDay}
                            onChange={e => setPaymentDueDay(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                            placeholder="5"
                        />
                    </div>
                </div>
            )}

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
