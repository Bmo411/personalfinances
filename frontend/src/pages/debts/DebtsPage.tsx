import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { PlusCircle, Users, Loader2, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export function DebtsPage() {
    const [activeTab, setActiveTab] = useState<'OWED_TO_ME' | 'I_OWE'>('I_OWE');
    const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
    const [selectedDebtId, setSelectedDebtId] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: debts = [], isLoading } = useQuery({
        queryKey: ['debts'],
        queryFn: financeService.getDebts
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteDebt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['debts'] });
        }
    });

    const handleDelete = (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredDebts = debts.filter(d => d.type === activeTab);

    // Totals
    const totalOwedToMe = debts.filter(d => d.type === 'OWED_TO_ME' && !d.is_settled).reduce((sum, d) => sum + Number(d.remaining_amount), 0);
    const totalIOwe = debts.filter(d => d.type === 'I_OWE' && !d.is_settled).reduce((sum, d) => sum + Number(d.remaining_amount), 0);

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Deudas y Préstamos</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Lleva el control de a quién le debes y quién te debe</p>
                </div>

                <button
                    onClick={() => setIsAddDebtModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                    <PlusCircle size={20} />
                    Nuevo Registro
                </button>
            </header>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div
                    onClick={() => setActiveTab('I_OWE')}
                    className={`rounded-2xl p-6 shadow-sm border transition-all cursor-pointer ${activeTab === 'I_OWE' ? 'border-red-400 bg-red-50/10' : 'border-brand-200 bg-[var(--bg-secondary)] hover:border-red-200'}`}
                >
                    <h2 className="text-[var(--text-secondary)] font-medium mb-2">Total que debo pagar</h2>
                    <p className="text-4xl font-bold text-red-500">
                        ${totalIOwe.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                <div
                    onClick={() => setActiveTab('OWED_TO_ME')}
                    className={`rounded-2xl p-6 shadow-sm border transition-all cursor-pointer ${activeTab === 'OWED_TO_ME' ? 'border-brand-500 bg-brand-50/10' : 'border-brand-200 bg-[var(--bg-secondary)] hover:border-brand-200'}`}
                >
                    <h2 className="text-[var(--text-secondary)] font-medium mb-2">Total por cobrar</h2>
                    <p className="text-4xl font-bold text-brand-600">
                        ${totalOwedToMe.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando registros...</div>
            ) : filteredDebts.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <Users size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No hay registros</h3>
                    <p className="text-[var(--text-secondary)] mt-2">
                        {activeTab === 'I_OWE' ? 'Felicidades, no tienes deudas pendientes aquí.' : 'Nadie te debe dinero por ahora.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredDebts.map(debt => (
                        <div key={debt.id} className={`bg-[var(--bg-secondary)] rounded-xl p-5 shadow-sm border ${debt.is_settled ? 'border-brand-200 opacity-60' : (activeTab === 'I_OWE' ? 'border-red-100' : 'border-brand-200')} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{debt.name}</h3>
                                    {debt.is_settled && (
                                        <span className="bg-brand-100 text-brand-800 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Saldado
                                        </span>
                                    )}
                                </div>
                                {debt.description && <p className="text-sm text-[var(--text-secondary)]">{debt.description}</p>}
                                {debt.due_date && <p className="text-xs text-[var(--text-secondary)] mt-2">Vence: {debt.due_date}</p>}
                            </div>

                            <div className="text-left sm:text-right">
                                <p className="text-sm text-[var(--text-secondary)] mb-1">Restante / Original</p>
                                <div className="flex items-baseline gap-2 sm:justify-end">
                                    <span className={`text-2xl font-bold ${debt.is_settled ? 'text-[var(--text-secondary)]' : (activeTab === 'I_OWE' ? 'text-red-500' : 'text-brand-600')}`}>
                                        ${Number(debt.remaining_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-sm text-[var(--text-secondary)]">
                                        / ${Number(debt.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDelete(debt.id)}
                                    className="p-2 bg-[var(--bg-main)] hover:bg-red-50 hover:text-red-500 text-[var(--text-secondary)] rounded-lg transition-colors border border-brand-200 flex items-center justify-center"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                                {!debt.is_settled && (
                                    <button
                                        onClick={() => {
                                            setSelectedDebtId(debt.id);
                                            setIsPaymentModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg transition-colors border border-brand-200 flex items-center justify-center gap-2"
                                    >
                                        {activeTab === 'I_OWE' ? 'Abonar' : 'Recibir Pago'} <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isAddDebtModalOpen} onClose={() => setIsAddDebtModalOpen(false)} title="Nuevo Registro">
                <CreateDebtForm onSuccess={() => setIsAddDebtModalOpen(false)} />
            </Modal>

            <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedDebtId(null); }} title="Registrar Pago">
                {selectedDebtId && (
                    <PaymentForm
                        debt={debts.find(d => d.id === selectedDebtId)!}
                        onSuccess={() => { setIsPaymentModalOpen(false); setSelectedDebtId(null); }}
                    />
                )}
            </Modal>
        </div>
    );
}

function CreateDebtForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'OWED_TO_ME' | 'I_OWE'>('I_OWE');

    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: financeService.createDebt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['debts'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            name,
            type,
            total_amount: amount,
            remaining_amount: amount
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setType('I_OWE')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'I_OWE' ? 'bg-[var(--bg-secondary)] text-red-600 shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'}`}
                > Yo debo (Deuda) </button>
                <button
                    type="button"
                    onClick={() => setType('OWED_TO_ME')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'OWED_TO_ME' ? 'bg-[var(--bg-secondary)] text-brand-600 shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'}`}
                > Me deben (Préstamo) </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    {type === 'I_OWE' ? 'A quién le debes?' : 'Quién te debe?'}
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Nombre..."
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monto Total ($)</label>
                <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full mt-6 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar'}
            </button>
        </form>
    );
}

function PaymentForm({ debt, onSuccess }: { debt: any, onSuccess: () => void }) {
    const [amount, setAmount] = useState('');
    const queryClient = useQueryClient();
    const remaining = Number(debt.remaining_amount);

    // Simplification for prototype: normally we'd hit a dedicated endpoint, 
    // but here we just PUT the updated remaining_amount to the debt.
    const mutation = useMutation({
        mutationFn: ({ id, payload }: { id: number, payload: any }) => financeService.updateDebt(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['debts'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payAmount = Number(amount);
        const newRemaining = remaining - payAmount;

        mutation.mutate({
            id: debt.id,
            payload: {
                remaining_amount: newRemaining.toString(),
                is_settled: newRemaining <= 0
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-brand-50 p-4 rounded-xl text-center mb-4 border border-brand-200">
                <p className="text-sm text-brand-700">Restante a pagar de {debt.name}</p>
                <p className="text-2xl font-bold text-brand-900">${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monto del abono</label>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remaining}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={mutation.isPending || Number(amount) > remaining}
                className="w-full mt-4 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Confirmar'}
            </button>
        </form>
    );
}
