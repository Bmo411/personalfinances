import { useState } from 'react';
import { PlusCircle, TrendingDown, TrendingUp, Wallet2, CalendarClock, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';
import { TransactionForm } from '../../components/transactions/TransactionForm';

export function Dashboard() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: summary, isLoading } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    // Fallbacks
    const totalIncome = Number(summary?.total_income || 0);
    const totalExpense = Number(summary?.total_expense || 0);
    const accounts = summary?.accounts || [];
    const upcomingFixed = Number(summary?.upcoming_fixed_expenses || 0);

    const calculatedTotalNetworth = accounts.reduce((sum: number, acc: any) => {
        // Credit cards are negative balances for networth
        const val = Number(acc.calculated_balance);
        return acc.type === 'CREDIT' ? sum - val : sum + val;
    }, 0);

    const chartData = [
        { name: 'Ingresos', value: totalIncome, color: '#16a34a' }, // brand-600 approx or green
        { name: 'Egresos', value: totalExpense, color: '#ef4444' }   // red-500 approx
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Hola de nuevo 👋</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Aquí está el resumen de tus finanzas</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                    <PlusCircle size={20} />
                    Nuevo Movimiento
                </button>
            </header>

            {isLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-secondary)]">Cargando datos...</div>
            ) : (
                <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 lg:col-span-2 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <div className="p-2 bg-brand-50 rounded-xl text-brand-700">
                                <Wallet2 size={24} />
                            </div>
                            <h2 className="text-[var(--text-secondary)] font-medium">Patrimonio Neto (Cuentas activas)</h2>
                        </div>
                        <p className="text-4xl font-bold text-[var(--text-primary)] relative z-10">
                            ${calculatedTotalNetworth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>

                        {/* Visual decoration */}
                        <div className="absolute -bottom-6 -right-6 text-brand-100 opacity-50 group-hover:scale-110 transition-transform duration-500">
                            <Wallet2 size={120} />
                        </div>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <TrendingUp size={18} className="text-brand-700" /> Ingresos
                        </h2>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <TrendingDown size={18} className="text-red-500" /> Egresos
                        </h2>
                        <p className="text-2xl font-bold text-red-500">
                            ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Chart Section */}
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 md:col-span-3">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-brand-600" /> Comparativa General
                        </h2>
                        <div className="h-64 md:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-hover)' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--brand-200)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                        formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total']}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </main>
            )}

            {!isLoading && upcomingFixed > 0 && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4 text-yellow-800 shadow-sm">
                    <div className="p-2 bg-yellow-100 rounded-full text-yellow-700 mt-1">
                        <CalendarClock size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Próximos Pagos Fijos</h3>
                        <p className="text-xs mt-0.5">
                            Tienes <strong>${upcomingFixed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> destinados a gastos recurrentes este mes. Asegúrate de tener saldo suficiente.
                        </p>
                    </div>
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Registrar Movimiento">
                <TransactionForm onSuccess={() => setIsAddModalOpen(false)} />
            </Modal>
        </div>
    );
}
