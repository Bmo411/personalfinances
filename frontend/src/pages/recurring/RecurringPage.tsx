import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { PlusCircle, CalendarClock, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { AccountSelector } from '../../components/transactions/AccountSelector';
import { CategorySelector } from '../../components/transactions/CategorySelector';

export function RecurringPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['recurring'],
        queryFn: financeService.getRecurringExpenses
    });

    const payMutation = useMutation({
        mutationFn: ({ id, account_id }: { id: number, account_id: number | null }) =>
            financeService.payRecurringExpense(id, undefined, account_id || undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }
    });

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDate = today.getDate();

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Gastos Fijos Mensuales</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Controla tus suscripciones y recibos recurrentes</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                    <PlusCircle size={20} />
                    Agregar
                </button>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando pagos fijos...</div>
            ) : expenses.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <CalendarClock size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin gastos fijos</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Agrega aquí tu renta, Netflix, o pagos domiciliados.</p>
                </div>
            ) : (
                <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-brand-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--bg-main)] text-[var(--text-secondary)] text-sm font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Servicio / Gasto</th>
                                    <th className="px-6 py-4">Día de Cobro</th>
                                    <th className="px-6 py-4">Costo Estimado</th>
                                    <th className="px-6 py-4">Estado este mes</th>
                                    <th className="px-6 py-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-100/50">
                                {expenses.map(expense => {
                                    // Check status
                                    let isPaidThisMonth = false;
                                    if (expense.last_paid_date) {
                                        const lastPaid = new Date(expense.last_paid_date);
                                        // Adjust for timezone offsets to ensure reliable month matching locally
                                        const lpMonth = lastPaid.getUTCMonth();
                                        const lpYear = lastPaid.getUTCFullYear();
                                        if (lpMonth === currentMonth && lpYear === currentYear) {
                                            isPaidThisMonth = true;
                                        }
                                    }

                                    const isDueSoon = !isPaidThisMonth && expense.due_day >= todayDate && (expense.due_day - todayDate) <= 5;
                                    const isPastDue = !isPaidThisMonth && expense.due_day < todayDate;

                                    return (
                                        <tr key={expense.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-[var(--text-primary)]">{expense.name}</p>
                                                {expense.account && <p className="text-xs text-[var(--text-secondary)]">Cargo aut. en cuenta ID: {expense.account}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-[var(--text-secondary)]">
                                                Día {expense.due_day}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-[var(--text-primary)]">
                                                    ${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isPaidThisMonth ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                                                        <CheckCircle2 size={14} /> Pagado
                                                    </span>
                                                ) : isPastDue ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                                                        Pendiente / Atrasado
                                                    </span>
                                                ) : isDueSoon ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-semibold rounded-full border border-yellow-200">
                                                        Por cobrar pronto
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-main)] text-[var(--text-secondary)] text-xs font-semibold rounded-full border border-brand-200">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!isPaidThisMonth && (
                                                    <button
                                                        disabled={payMutation.isPending && payMutation.variables?.id === expense.id}
                                                        onClick={() => {
                                                            if (window.confirm(`¿Confirmar cobro de ${expense.name}? Se registrará un egreso de $${expense.amount}.`)) {
                                                                payMutation.mutate({ id: expense.id, account_id: expense.account });
                                                            }
                                                        }}
                                                        className="text-sm bg-brand-600 hover:bg-brand-700 text-white py-1.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                                                    >
                                                        {payMutation.isPending && payMutation.variables?.id === expense.id ? <Loader2 size={16} className="animate-spin" /> : 'Registrar Pago'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Gasto Fijo">
                <RecurringForm onSuccess={() => setIsAddModalOpen(false)} />
            </Modal>
        </div>
    );
}

function RecurringForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState('1');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [accountId, setAccountId] = useState<number | null>(null);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: financeService.createRecurringExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            name,
            amount: amount,
            due_day: parseInt(dueDay),
            category: categoryId,
            account: accountId
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 overflow-visible pb-24">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre del Servicio</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Netflix, Renta, Spotify..."
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Costo Promedio ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] relative z-0"
                        placeholder="0.00"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Día de cobro</label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={e => setDueDay(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] relative z-0"
                        required
                    />
                </div>
            </div>

            <div className="z-50 relative pb-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Categoría (Opcional)</label>
                <CategorySelector
                    type="OUT"
                    value={categoryId}
                    onChange={setCategoryId}
                />
            </div>

            <div className="z-40 relative pb-2 pt-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Cuenta automática (Opcional)</label>
                <AccountSelector
                    value={accountId}
                    onChange={setAccountId}
                />
            </div>

            <div className="absolute bottom-6 left-6 right-6 pt-4 bg-[var(--bg-secondary)] border-t border-brand-100 z-50">
                <button
                    type="submit"
                    disabled={mutation.isPending || !name || !amount}
                    className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center shadow-sm disabled:opacity-50"
                >
                    {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar Gasto Fijo'}
                </button>
            </div>
        </form>
    );
}
