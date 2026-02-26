import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { History, TrendingDown, TrendingUp, Search, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function HistoryPage() {
    const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const queryClient = useQueryClient();

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions', 'history'],
        queryFn: () => financeService.getTransactions()
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
        }
    });

    const handleDelete = (id: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento? Esto afectará tus saldos.')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const descMatch = t.description?.toLowerCase().includes(query);
            const catMatch = t.category_name?.toLowerCase().includes(query);
            if (!descMatch && !catMatch) return false;
        }
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Historial de Transacciones</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Revisa todos tus movimientos financieros</p>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-brand-200 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex w-full md:w-auto bg-[var(--bg-hover)] p-1 rounded-xl">
                    <button
                        onClick={() => setFilterType('ALL')}
                        className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterType === 'ALL' ? 'bg-[var(--bg-secondary)] text-brand-700 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('IN')}
                        className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${filterType === 'IN' ? 'bg-[var(--bg-secondary)] text-brand-600 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <TrendingUp size={16} /> Ingresos
                    </button>
                    <button
                        onClick={() => setFilterType('OUT')}
                        className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${filterType === 'OUT' ? 'bg-[var(--bg-secondary)] text-red-600 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <TrendingDown size={16} /> Egresos
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-400">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar movimiento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando historial...</div>
            ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <History size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No hay transacciones</h3>
                    <p className="text-[var(--text-secondary)] mt-2">
                        No se encontraron movimientos con los filtros actuales.
                    </p>
                </div>
            ) : (
                <div className="bg-[var(--bg-secondary)] rounded-2xl border border-brand-200 shadow-sm overflow-hidden auto-rows-max">
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-brand-100 font-medium text-[var(--text-secondary)] text-sm">
                        <div className="col-span-2">Fecha</div>
                        <div className="col-span-5">Descripción</div>
                        <div className="col-span-3">Categoría</div>
                        <div className="col-span-2 text-right">Monto</div>
                    </div>

                    <div className="divide-y divide-brand-100">
                        {filteredTransactions.map(tx => (
                            <div key={tx.id} className="p-4 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 md:items-center hover:bg-[var(--bg-hover)] transition-colors">
                                <div className="col-span-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <Calendar size={14} className="md:hidden" />
                                    {format(new Date(tx.date + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
                                </div>
                                <div className="col-span-5 flex flex-col">
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {tx.description || (tx.category_name || 'Sin descripción')}
                                    </span>
                                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                        Pago: {tx.payment_method === 'CASH' ? 'Efectivo' : tx.payment_method === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                                    </span>
                                </div>
                                <div className="col-span-3">
                                    <span className="inline-block px-3 py-1 bg-brand-50 text-brand-700 text-xs rounded-full border border-brand-100">
                                        {tx.category_name || 'General'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-left md:text-right mt-1 md:mt-0 font-bold flex items-center justify-between md:justify-end gap-4">
                                    <span className={tx.type === 'IN' ? 'text-brand-600' : 'text-red-500'}>
                                        {tx.type === 'IN' ? '+' : '-'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        disabled={deleteMutation.isPending}
                                        className="text-[var(--text-secondary)] hover:text-red-500 transition-colors p-2 md:p-0 disabled:opacity-50"
                                        title="Eliminar movimiento"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
