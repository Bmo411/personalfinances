import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import type { SpendingKind } from '../../services/finance';
import { CategorySelector } from './CategorySelector';
import { AccountSelector } from './AccountSelector';
import { Loader2 } from 'lucide-react';

interface TransactionFormProps {
    onSuccess: () => void;
}

type TransferPayload = Parameters<typeof financeService.createTransfer>[0];
type TransactionPayload = Parameters<typeof financeService.createTransaction>[0];
type TransactionMutationPayload = TransferPayload | TransactionPayload;

const spendingOptions: { value: SpendingKind; label: string; description: string }[] = [
    { value: 'NECESSARY', label: 'Necesario', description: 'Renta, comida, salud, transporte' },
    { value: 'OUTING', label: 'Salida', description: 'Planes, cenas, cafe, ocio social' },
    { value: 'IMPULSE', label: 'Impulso', description: 'Compra no planeada' },
    { value: 'OPTIONAL', label: 'Opcional', description: 'Gusto planeado' },
];

export function TransactionForm({ onSuccess }: TransactionFormProps) {
    const [type, setType] = useState<'IN' | 'OUT' | 'TRANSFER'>('OUT');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState<number | null>(null);
    const [toAccountId, setToAccountId] = useState<number | null>(null);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [spendingKind, setSpendingKind] = useState<SpendingKind>('NECESSARY');
    const [description, setDescription] = useState('');

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: TransactionMutationPayload) => type === 'TRANSFER'
            ? financeService.createTransfer(data as TransferPayload)
            : financeService.createTransaction(data as TransactionPayload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (type === 'TRANSFER') {
            if (!amount || !date || !accountId || !toAccountId) return;
            mutation.mutate({
                from_account: accountId,
                to_account: toAccountId,
                amount,
                date,
                description
            });
        } else {
            if (!amount || !date || !categoryId || !accountId) return;
            mutation.mutate({
                type,
                amount,
                date,
                account: accountId,
                category: categoryId,
                description,
                payment_method: 'CASH', // Default for now, can be expanded
                spending_kind: type === 'OUT' ? spendingKind : null,
            });
        }
    };

    const isButtonDisabled = type === 'TRANSFER'
        ? (mutation.isPending || !amount || !accountId || !toAccountId)
        : (mutation.isPending || !categoryId || !amount || !accountId);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de Tipo */}
            <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl">
                <button
                    type="button"
                    onClick={() => { setType('OUT'); setCategoryId(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'OUT' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'
                        }`}
                >
                    Egreso
                </button>
                <button
                    type="button"
                    onClick={() => { setType('IN'); setCategoryId(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'IN' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'
                        }`}
                >
                    Ingreso
                </button>
                <button
                    type="button"
                    onClick={() => { setType('TRANSFER'); setCategoryId(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'TRANSFER' ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'
                        }`}
                >
                    Transferencia
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monto ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-[var(--bg-main)] text-[var(--text-primary)]"
                        placeholder="0.00"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Fecha</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-[var(--bg-main)] text-[var(--text-primary)]"
                        required
                    />
                </div>
            </div>

            {type === 'TRANSFER' ? (
                <>
                    <div className="z-30 relative space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Cuenta Origen</label>
                        <AccountSelector
                            value={accountId}
                            onChange={setAccountId}
                        />
                    </div>
                    <div className="z-20 relative space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Cuenta Destino</label>
                        <AccountSelector
                            value={toAccountId}
                            onChange={setToAccountId}
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="z-30 relative space-y-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">Cuenta</label>
                        <AccountSelector
                            value={accountId}
                            onChange={setAccountId}
                        />
                    </div>
                    <div className="z-20 relative space-y-2">
                        <CategorySelector
                            type={type}
                            value={categoryId}
                            onChange={setCategoryId}
                        />
                    </div>

                    {type === 'OUT' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">Tipo de gasto</label>
                            <div className="grid grid-cols-2 gap-2">
                                {spendingOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSpendingKind(option.value)}
                                        className={`min-h-20 rounded-xl border px-3 py-2 text-left transition-colors ${spendingKind === option.value
                                            ? 'border-brand-700 bg-brand-50 text-brand-900'
                                            : 'border-brand-200 bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                    >
                                        <span className="block text-sm font-semibold">{option.label}</span>
                                        <span className="block text-xs mt-1 leading-snug">{option.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Descripción (Opcional)</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder={type === 'TRANSFER' ? "Ej: Traspaso a ahorros..." : "Ej: Compra de supermercado..."}
                />
            </div>

            <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full mt-6 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Movimiento'}
            </button>
        </form>
    );
}
