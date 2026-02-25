import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { CategorySelector } from './CategorySelector';
import { Loader2 } from 'lucide-react';

interface TransactionFormProps {
    onSuccess: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
    const [type, setType] = useState<'IN' | 'OUT'>('OUT');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [description, setDescription] = useState('');

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: financeService.createTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !date || !categoryId) return;

        mutation.mutate({
            type,
            amount,
            date,
            category: categoryId,
            description,
            payment_method: 'CASH', // Default for now, can be expanded
        });
    };

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

            <div className="z-20 relative">
                <CategorySelector
                    type={type}
                    value={categoryId}
                    onChange={setCategoryId}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Descripción (Opcional)</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Ej: Compra de supermercado..."
                />
            </div>

            <button
                type="submit"
                disabled={mutation.isPending || !categoryId || !amount}
                className="w-full mt-6 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Movimiento'}
            </button>
        </form>
    );
}
