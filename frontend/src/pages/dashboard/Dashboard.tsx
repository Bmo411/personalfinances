import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    BadgeDollarSign,
    CalendarClock,
    CalendarDays,
    CreditCard,
    Flame,
    LineChart as LineChartIcon,
    PiggyBank,
    PlusCircle,
    ShieldCheck,
    Target,
    Trophy,
    Wallet2,
} from 'lucide-react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart as ReLineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import type { SummaryQueryParams } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';
import { TransactionForm } from '../../components/transactions/TransactionForm';

type PeriodMode = 'all' | 'month' | 'range';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatMoney = (value: number) => {
    const sign = value < 0 ? '-' : '';
    return `${sign}$${currencyFormatter.format(Math.abs(value))}`;
};

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
        year: 'numeric',
    }).format(new Date(year, month - 1, 1));
};

const formatShortDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(`${dateString}T00:00:00`));
};

function MetricCard({
    title,
    value,
    helper,
    icon: Icon,
    tone = 'default',
}: {
    title: string;
    value: string;
    helper?: string;
    icon: LucideIcon;
    tone?: 'default' | 'good' | 'bad' | 'focus';
}) {
    const toneClass = {
        default: 'text-brand-700 bg-brand-50',
        good: 'text-green-700 bg-green-50',
        bad: 'text-red-600 bg-red-50',
        focus: 'text-amber-700 bg-amber-50',
    }[tone];

    return (
        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-5 shadow-sm min-h-36">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{value}</p>
                </div>
                <div className={`p-2 rounded-xl ${toneClass}`}>
                    <Icon size={22} />
                </div>
            </div>
            {helper && <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">{helper}</p>}
        </div>
    );
}

function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'red' | 'amber' }) {
    const safeValue = Math.max(0, Math.min(100, value));
    const fillClass = {
        brand: 'bg-brand-700',
        green: 'bg-green-600',
        red: 'bg-red-500',
        amber: 'bg-amber-500',
    }[tone];

    return (
        <div className="h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${safeValue}%` }} />
        </div>
    );
}

function RatingDots({ value }: { value: number }) {
    return (
        <span className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((index) => (
                <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${index < value ? 'bg-amber-500' : 'bg-[var(--bg-hover)]'}`}
                />
            ))}
        </span>
    );
}

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
        queryFn: () => financeService.getSummary(summaryParams),
    });

    const liquidBalance = Number(summary?.liquid_balance || 0);
    const netWorth = Number(summary?.net_worth || 0);
    const totalDebt = Number(summary?.total_debt || 0);
    const emergencyPercent = Number(summary?.emergency_fund?.percent || 0);
    const emergencyCurrent = Number(summary?.emergency_fund?.current || 0);
    const emergencyTarget = Number(summary?.emergency_fund?.target || 0);
    const outingSpent = Number(summary?.spending_behavior?.outing || 0);
    const outingBudget = Number(summary?.spending_behavior?.outing_budget || 0);
    const outingPercent = outingBudget > 0 ? (outingSpent / outingBudget) * 100 : 0;
    const receivableDebt = Number(summary?.receivable_debt || 0);
    const futureLiquidity = Number(summary?.future_liquidity || 0);
    const daysWithoutImpulse = summary?.spending_behavior?.days_without_impulse;
    const upcomingPayment = summary?.upcoming_important_payment;
    const score = summary?.financial_score;
    const netWorthHistory = summary?.net_worth_history ?? [];
    const cashflowProjection = summary?.cashflow_projection ?? [];
    const debtProgress = summary?.debt_progress ?? [];

    const periodLabel = periodMode === 'all'
        ? 'Historico general'
        : periodMode === 'month'
            ? formatMonthLabel(monthValue)
            : `${dateFrom} a ${dateTo}`;

    const scoreRows = score ? [
        { label: 'Liquidez', value: score.components.liquidity },
        { label: 'Deuda', value: score.components.debt },
        { label: 'Ahorro', value: score.components.savings },
        { label: 'Patrimonio', value: score.components.net_worth },
        { label: 'Disciplina', value: score.components.discipline },
    ] : [];

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <header className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Centro de control para {periodLabel}</p>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
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
                        Nuevo movimiento
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="h-40 flex items-center justify-center text-[var(--text-secondary)]">Cargando datos...</div>
            ) : (
                <main className="space-y-6">
                    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                        <MetricCard
                            title="Liquidez Disponible"
                            value={formatMoney(liquidBalance)}
                            helper="Dinero usable en efectivo y cuentas de debito."
                            icon={Wallet2}
                            tone="good"
                        />
                        <MetricCard
                            title="Patrimonio Neto"
                            value={formatMoney(netWorth)}
                            helper="Todo lo que tienes menos lo que debes."
                            icon={LineChartIcon}
                            tone={netWorth >= 0 ? 'good' : 'bad'}
                        />
                        <MetricCard
                            title="Deuda Total"
                            value={formatMoney(totalDebt)}
                            helper="Deudas por pagar mas tarjetas."
                            icon={CreditCard}
                            tone={totalDebt > 0 ? 'bad' : 'good'}
                        />
                        <MetricCard
                            title="Fondo de Emergencia"
                            value={`${emergencyPercent.toFixed(0)}%`}
                            helper={`${formatMoney(emergencyCurrent)} / ${formatMoney(emergencyTarget)}`}
                            icon={ShieldCheck}
                            tone="focus"
                        />
                        <MetricCard
                            title="Proximo pago importante"
                            value={upcomingPayment ? formatShortDate(upcomingPayment.date) : 'Sin pagos'}
                            helper={upcomingPayment ? `${upcomingPayment.label} - ${formatMoney(Number(upcomingPayment.amount || 0))}` : 'No hay pagos fuertes en los proximos dias.'}
                            icon={CalendarClock}
                            tone="focus"
                        />
                        <MetricCard
                            title="Dias sin gasto impulsivo"
                            value={daysWithoutImpulse === null || daysWithoutImpulse === undefined ? 'Sin registros' : `${daysWithoutImpulse}`}
                            helper="Se reinicia cuando marcas un gasto como impulso."
                            icon={Flame}
                            tone="default"
                        />
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm xl:col-span-2">
                            <div className="flex items-center justify-between gap-3 mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Patrimonio Neto Historico</h2>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">Linea principal y avance acumulado por mes.</p>
                                </div>
                                <LineChartIcon className="text-brand-700" size={24} />
                            </div>

                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReLineChart data={netWorthHistory} margin={{ top: 10, right: 18, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-200)" />
                                        <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={(value) => formatMoney(Number(value)).replace('.00', '')} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid var(--brand-200)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
                                            formatter={(value: number | string | undefined) => formatMoney(Number(value || 0))}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="net_worth" name="Patrimonio" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="cumulative_change" name="Acumulado" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                                    </ReLineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <PiggyBank className="text-brand-700" size={24} />
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Fondo de Emergencia</h2>
                            </div>
                            <ProgressBar value={emergencyPercent} tone="green" />
                            <div className="flex justify-between gap-3 text-sm mt-3 text-[var(--text-secondary)]">
                                <span>{formatMoney(emergencyCurrent)}</span>
                                <span>{formatMoney(emergencyTarget)}</span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-5">
                                {summary?.emergency_fund.months
                                    ? `Equivale a ${Number(summary.emergency_fund.months).toFixed(1)} meses de gasto promedio.`
                                    : 'Aun faltan gastos suficientes para estimar meses de cobertura.'}
                            </p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <Target className="text-amber-600" size={24} />
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Salidas del mes</h2>
                            </div>
                            <ProgressBar value={outingPercent} tone={outingPercent > 100 ? 'red' : 'amber'} />
                            <div className="mt-4 text-sm text-[var(--text-secondary)] space-y-1">
                                <p>Gastado: <strong className="text-[var(--text-primary)]">{formatMoney(outingSpent)}</strong></p>
                                <p>Presupuesto: <strong className="text-[var(--text-primary)]">{formatMoney(outingBudget)}</strong></p>
                                <p>Restante: <strong className={outingBudget - outingSpent >= 0 ? 'text-green-600' : 'text-red-500'}>{formatMoney(outingBudget - outingSpent)}</strong></p>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <BadgeDollarSign className="text-brand-700" size={24} />
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Dinero pendiente</h2>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-[var(--text-secondary)]">Liquidez</span>
                                    <strong>{formatMoney(liquidBalance)}</strong>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-[var(--text-secondary)]">Por cobrar</span>
                                    <strong>{formatMoney(receivableDebt)}</strong>
                                </div>
                                <div className="flex justify-between gap-3 pt-3 border-t border-brand-100">
                                    <span className="text-[var(--text-secondary)]">Liquidez futura</span>
                                    <strong className="text-brand-700">{formatMoney(futureLiquidity)}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <Trophy className="text-amber-600" size={24} />
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Score financiero</h2>
                            </div>
                            <p className="text-4xl font-bold text-[var(--text-primary)]">{score?.total ?? 0}<span className="text-lg text-[var(--text-secondary)]">/100</span></p>
                            <div className="mt-4 space-y-2">
                                {scoreRows.map((row) => (
                                    <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-[var(--text-secondary)]">{row.label}</span>
                                        <RatingDots value={row.value} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <Wallet2 className="text-brand-700" size={24} />
                                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Dias de libertad</h2>
                            </div>
                            <p className="text-4xl font-bold text-[var(--text-primary)]">{summary?.days_of_freedom ?? 0}</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-3">Dias estimados que puedes cubrir con tu liquidez actual.</p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <CreditCard className="text-red-500" size={24} />
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Progreso de Deudas</h2>
                            </div>
                            {debtProgress.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No tienes deudas activas por pagar registradas.</p>
                            ) : (
                                <div className="space-y-5">
                                    {debtProgress.map((debt) => {
                                        const percent = Number(debt.percent || 0);
                                        return (
                                            <div key={debt.id}>
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <div>
                                                        <p className="font-semibold text-[var(--text-primary)]">{debt.name}</p>
                                                        <p className="text-xs text-[var(--text-secondary)]">Restante: {formatMoney(Number(debt.remaining_amount || 0))}</p>
                                                    </div>
                                                    <span className="text-sm font-semibold text-brand-700">{percent.toFixed(0)}%</span>
                                                </div>
                                                <ProgressBar value={percent} tone="brand" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--bg-secondary)] border border-brand-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <CalendarClock className="text-brand-700" size={24} />
                                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Proyeccion de flujo</h2>
                            </div>
                            {cashflowProjection.length <= 1 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No hay pagos proximos para proyectar.</p>
                            ) : (
                                <div className="space-y-3">
                                    {cashflowProjection.map((point) => (
                                        <div key={`${point.date}-${point.label}`} className="flex items-center justify-between gap-4 rounded-xl border border-brand-100 px-4 py-3">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{formatShortDate(point.date)} - {point.label}</p>
                                                {Number(point.amount || 0) > 0 && (
                                                    <p className={point.direction === 'IN' ? 'text-xs text-green-600' : 'text-xs text-[var(--text-secondary)]'}>
                                                        {point.direction === 'IN' ? 'Ingreso' : 'Pago'}: {formatMoney(Number(point.amount || 0))}
                                                    </p>
                                                )}
                                            </div>
                                            <strong className={Number(point.balance_after || 0) >= 0 ? 'text-brand-700' : 'text-red-500'}>
                                                {formatMoney(Number(point.balance_after || 0))}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Registrar Movimiento">
                <TransactionForm onSuccess={() => setIsAddModalOpen(false)} />
            </Modal>
        </div>
    );
}
