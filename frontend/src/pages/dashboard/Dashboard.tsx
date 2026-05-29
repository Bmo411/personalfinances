import { useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarClock, CalendarDays, CreditCard, PlusCircle, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import type { SummaryCategoryTotal, SummaryQueryParams } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';
import { TransactionForm } from '../../components/transactions/TransactionForm';

type PeriodMode = 'all' | 'month' | 'range';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatMonthInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const formatMonthLabel = (monthValue: string) => {
    const [year, month] = monthValue.split('-').map(Number);
    if (!year || !month) return 'Mes seleccionado';

    return new Intl.DateTimeFormat('es-MX', {
        month: 'long',
        year: 'numeric'
    }).format(new Date(year, month - 1, 1));
};

export function Dashboard() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const today = useMemo(() => new Date(), []);
    const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
    const [monthValue, setMonthValue] = useState(formatMonthInput(today));
    const [dateFrom, setDateFrom] = useState(formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [dateTo, setDateTo] = useState(formatDateInput(today));

    const summaryParams = useMemo<SummaryQueryParams | undefined>(() => {
        if (periodMode === 'month') {
            const [year, month] = monthValue.split('-').map(Number);
            if (!year || !month) return undefined;
            return { month, year };
        }

        if (periodMode === 'range') {
            return { date_from: dateFrom, date_to: dateTo };
        }

        return undefined;
    }, [dateFrom, dateTo, monthValue, periodMode]);

    const { data: summary, isLoading } = useQuery({
        queryKey: ['summary', periodMode, summaryParams],
        queryFn: () => financeService.getSummary(summaryParams)
    });

    const totalIncome = Number(summary?.total_income || 0);
    const totalExpense = Number(summary?.total_expense || 0);
    const creditCardExpense = Number(summary?.credit_card_expense || 0);
    const liquidBalance = Number(summary?.liquid_balance || 0);
    const netWorth = Number(summary?.net_worth || 0);
    const creditCardDebt = Number(summary?.credit_card_debt || 0);
    const upcomingFixed = Number(summary?.upcoming_fixed_expenses || 0);
    const expenseTrend = summary?.expense_trend ?? summary?.last_7_days_expenses ?? [];

    const chartData = [
        { name: 'Ingresos', value: totalIncome, color: '#16a34a' },
        { name: 'Egresos', value: totalExpense, color: '#ef4444' }
    ];

    const formatChartDate = (dateString: string) => {
        const [, month, day] = dateString.split('-');
        return `${day}/${month}`;
    };

    const periodLabel = periodMode === 'all'
        ? 'Historico general'
        : periodMode === 'month'
            ? formatMonthLabel(monthValue)
            : `${dateFrom} a ${dateTo}`;

    const trendTitle = periodMode === 'all' ? 'Gastos recientes' : 'Gastos del periodo';

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Hola de nuevo</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Resumen para {periodLabel}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-[var(--bg-secondary)] p-1 shadow-sm">
                        {(['month', 'range', 'all'] as PeriodMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setPeriodMode(mode)}
                                className={`h-10 px-3 rounded-lg text-sm font-medium transition-colors ${periodMode === mode
                                    ? 'bg-brand-700 text-white'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                {mode === 'month' ? 'Mensual' : mode === 'range' ? 'Rango' : 'General'}
                            </button>
                        ))}
                    </div>

                    {periodMode === 'month' && (
                        <label className="h-12 px-3 rounded-xl border border-brand-200 bg-[var(--bg-secondary)] shadow-sm flex items-center gap-2">
                            <CalendarDays size={18} className="text-brand-700" />
                            <input
                                type="month"
                                value={monthValue}
                                onChange={(event) => setMonthValue(event.target.value)}
                                className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
                            />
                        </label>
                    )}

                    {periodMode === 'range' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <label className="h-12 px-3 rounded-xl border border-brand-200 bg-[var(--bg-secondary)] shadow-sm flex items-center gap-2">
                                <CalendarDays size={18} className="text-brand-700" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(event) => setDateFrom(event.target.value)}
                                    className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
                                />
                            </label>
                            <label className="h-12 px-3 rounded-xl border border-brand-200 bg-[var(--bg-secondary)] shadow-sm flex items-center gap-2">
                                <CalendarDays size={18} className="text-brand-700" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(event) => setDateTo(event.target.value)}
                                    className="bg-transparent text-sm text-[var(--text-primary)] outline-none"
                                />
                            </label>
                        </div>
                    )}

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-12 bg-brand-700 hover:bg-brand-900 text-white font-medium px-5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={20} />
                        Nuevo Movimiento
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-secondary)]">Cargando datos...</div>
            ) : (
                <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 md:col-span-2 lg:col-span-1 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <div className="p-2 bg-brand-50 rounded-xl text-brand-700">
                                <Wallet2 size={24} />
                            </div>
                            <h2 className="text-[var(--text-secondary)] font-medium">Liquidez disponible</h2>
                        </div>
                        <p className="text-4xl font-bold text-[var(--text-primary)] relative z-10">
                            ${currencyFormatter.format(liquidBalance)}
                        </p>

                        <div className="absolute -bottom-6 -right-6 text-brand-100 opacity-50 group-hover:scale-110 transition-transform duration-500">
                            <Wallet2 size={120} />
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <Wallet2 size={18} className="text-brand-700" /> Patrimonio neto
                        </h2>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            ${currencyFormatter.format(netWorth)}
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <TrendingUp size={18} className="text-brand-700" /> Ingresos
                        </h2>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">
                            ${currencyFormatter.format(totalIncome)}
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <TrendingDown size={18} className="text-red-500" /> Egresos
                        </h2>
                        <p className="text-2xl font-bold text-red-500">
                            ${currencyFormatter.format(totalExpense)}
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <CreditCard size={18} className="text-red-500" /> Deuda tarjetas
                        </h2>
                        <p className="text-2xl font-bold text-red-500">
                            ${currencyFormatter.format(creditCardDebt)}
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            <CreditCard size={18} className="text-amber-600" /> Gasto credito
                        </h2>
                        <p className="text-2xl font-bold text-amber-600">
                            ${currencyFormatter.format(creditCardExpense)}
                        </p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 md:col-span-2 lg:col-span-5">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-red-500" /> {trendTitle}
                        </h2>
                        <div className="h-64 md:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={expenseTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-200)" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatChartDate}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `$${value}`}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: 'var(--brand-200)', strokeWidth: 2, strokeDasharray: '4 4' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-[var(--bg-main)] border border-brand-200 p-3 rounded-xl shadow-lg text-[var(--text-primary)] min-w-[150px]">
                                                        <p className="font-medium text-sm mb-2 border-b border-brand-100 pb-1">Fecha: {label}</p>
                                                        <p className="text-red-500 font-bold mb-2">Total: ${currencyFormatter.format(Number(data.total || 0))}</p>

                                                        {data.categories && data.categories.length > 0 && (
                                                            <div className="space-y-1 mt-2">
                                                                <p className="text-xs text-[var(--text-secondary)] font-medium">Desglose:</p>
                                                                {data.categories.map((cat: SummaryCategoryTotal, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between text-xs">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.category__color || '#ccc' }}></span>
                                                                            <span className="truncate max-w-[80px]" title={cat.category__name || 'Sin categoria'}>
                                                                                {cat.category__name || 'Sin categoria'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="font-medium">${currencyFormatter.format(Number(cat.total || 0))}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 md:col-span-2 lg:col-span-1">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-6 flex items-center gap-2">
                            <BarChart3 size={18} className="text-brand-600" /> Comparativa
                        </h2>
                        <div className="h-64 md:h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--bg-hover)' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--brand-200)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                        formatter={(value: number | string | undefined) => [`$${currencyFormatter.format(Number(value || 0))}`, 'Total']}
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
                        <h3 className="font-bold text-sm">Proximos pagos fijos</h3>
                        <p className="text-xs mt-0.5">
                            Tienes <strong>${currencyFormatter.format(upcomingFixed)}</strong> destinados a gastos recurrentes este mes. Asegurate de tener saldo suficiente.
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
