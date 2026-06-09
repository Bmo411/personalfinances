import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Banknote,
    BellRing,
    CalendarClock,
    CheckCircle2,
    Loader2,
    Pencil,
    PlusCircle,
    Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeService, RecurringExpense, RecurringIncome, RecurringIncomeSourceType } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';
import { AccountSelector } from '../../components/transactions/AccountSelector';
import { CategorySelector } from '../../components/transactions/CategorySelector';

type ActiveTab = 'expenses' | 'incomes';

const moneyFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatMoney(value: string | number) {
    return `$${moneyFormatter.format(Number(value || 0))}`;
}

function isDoneThisMonth(dateValue?: string | null) {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    const today = new Date();
    return date.getUTCMonth() === today.getMonth() && date.getUTCFullYear() === today.getFullYear();
}

function monthlyStatus(day: number, lastDate?: string | null, doneLabel = 'Registrado') {
    if (isDoneThisMonth(lastDate)) {
        return { label: doneLabel, tone: 'green', icon: true };
    }

    const today = new Date().getDate();
    if (day < today) return { label: 'Pendiente / atrasado', tone: 'red', icon: false };
    if (day - today <= 5) return { label: 'Pronto', tone: 'yellow', icon: false };
    return { label: 'Pendiente', tone: 'neutral', icon: false };
}

function StatusPill({ status }: { status: ReturnType<typeof monthlyStatus> }) {
    const classes = {
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        neutral: 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-brand-200',
    }[status.tone];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${classes}`}>
            {status.icon && <CheckCircle2 size={14} />}
            {status.label}
        </span>
    );
}

function sourceTypeLabel(type: RecurringIncomeSourceType) {
    if (type === 'PASSIVE') return 'Pasivo';
    if (type === 'OTHER') return 'Otro';
    return 'Activo';
}

export function RecurringPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
    const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
        queryKey: ['recurring'],
        queryFn: financeService.getRecurringExpenses
    });

    const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
        queryKey: ['recurring-incomes'],
        queryFn: financeService.getRecurringIncomes
    });

    const deleteExpenseMutation = useMutation({
        mutationFn: financeService.deleteRecurringExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
        }
    });

    const deleteIncomeMutation = useMutation({
        mutationFn: financeService.deleteRecurringIncome,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
        }
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

    const receiveMutation = useMutation({
        mutationFn: ({ id, account_id }: { id: number, account_id: number | null }) =>
            financeService.receiveRecurringIncome(id, undefined, account_id || undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }
    });

    const isLoading = loadingExpenses || loadingIncomes;
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalIncomes = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Ingresos y gastos fijos</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Automatiza salario, clientes recurrentes, suscripciones y recibos mensuales.</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    <PlusCircle size={20} />
                    Agregar {activeTab === 'incomes' ? 'ingreso' : 'gasto'}
                </button>
            </header>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setActiveTab('incomes')}
                    className={`rounded-2xl border p-5 text-left transition-colors ${activeTab === 'incomes' ? 'bg-brand-700 border-brand-700 text-white shadow-sm' : 'bg-[var(--bg-secondary)] border-brand-200 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium opacity-80">Ingresos fijos mensuales</p>
                            <p className="text-2xl font-bold mt-1">{formatMoney(totalIncomes)}</p>
                        </div>
                        <ArrowUpCircle size={28} />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className={`rounded-2xl border p-5 text-left transition-colors ${activeTab === 'expenses' ? 'bg-brand-700 border-brand-700 text-white shadow-sm' : 'bg-[var(--bg-secondary)] border-brand-200 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium opacity-80">Gastos fijos mensuales</p>
                            <p className="text-2xl font-bold mt-1">{formatMoney(totalExpenses)}</p>
                        </div>
                        <ArrowDownCircle size={28} />
                    </div>
                </button>
            </div>

            <div className="mb-6 flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800">
                <BellRing size={20} className="mt-0.5 shrink-0 text-green-600" />
                <div className="text-sm">
                    <span className="font-semibold">WhatsApp sigue avisando gastos fijos y tarjetas.</span>
                    {' '}Los ingresos fijos marcados como automaticos se registran solos el dia de cobro desde el scheduler.{' '}
                    <Link to="/preferences" className="underline font-semibold hover:text-green-900 transition-colors">
                        Revisa tus preferencias
                    </Link>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando fijos...</div>
            ) : activeTab === 'incomes' ? (
                <IncomeTable
                    incomes={incomes}
                    onEdit={setEditingIncome}
                    onDelete={(income) => {
                        if (window.confirm(`Eliminar el ingreso fijo "${income.name}"?`)) {
                            deleteIncomeMutation.mutate(income.id);
                        }
                    }}
                    onReceive={(income) => {
                        if (window.confirm(`Registrar ingreso de ${income.name} por ${formatMoney(income.amount)}?`)) {
                            receiveMutation.mutate({ id: income.id, account_id: income.account });
                        }
                    }}
                    receiveMutation={receiveMutation}
                    deleteMutation={deleteIncomeMutation}
                />
            ) : (
                <ExpenseTable
                    expenses={expenses}
                    onEdit={setEditingExpense}
                    onDelete={(expense) => {
                        if (window.confirm(`Eliminar el gasto fijo "${expense.name}"?`)) {
                            deleteExpenseMutation.mutate(expense.id);
                        }
                    }}
                    onPay={(expense) => {
                        if (window.confirm(`Registrar pago de ${expense.name} por ${formatMoney(expense.amount)}?`)) {
                            payMutation.mutate({ id: expense.id, account_id: expense.account });
                        }
                    }}
                    payMutation={payMutation}
                    deleteMutation={deleteExpenseMutation}
                />
            )}

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={activeTab === 'incomes' ? 'Nuevo ingreso fijo' : 'Nuevo gasto fijo'}>
                {activeTab === 'incomes' ? (
                    <RecurringIncomeForm onSuccess={() => setIsAddModalOpen(false)} />
                ) : (
                    <RecurringExpenseForm onSuccess={() => setIsAddModalOpen(false)} />
                )}
            </Modal>

            <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Editar gasto fijo">
                {editingExpense && <RecurringExpenseForm expense={editingExpense} onSuccess={() => setEditingExpense(null)} />}
            </Modal>

            <Modal isOpen={!!editingIncome} onClose={() => setEditingIncome(null)} title="Editar ingreso fijo">
                {editingIncome && <RecurringIncomeForm income={editingIncome} onSuccess={() => setEditingIncome(null)} />}
            </Modal>
        </div>
    );
}

function IncomeTable({
    incomes,
    onEdit,
    onDelete,
    onReceive,
    receiveMutation,
    deleteMutation,
}: {
    incomes: RecurringIncome[];
    onEdit: (income: RecurringIncome) => void;
    onDelete: (income: RecurringIncome) => void;
    onReceive: (income: RecurringIncome) => void;
    receiveMutation: UseMutationResult<RecurringIncome, Error, { id: number; account_id: number | null }>;
    deleteMutation: UseMutationResult<unknown, Error, number>;
}) {
    if (incomes.length === 0) {
        return (
            <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                <Banknote size={48} className="mx-auto text-brand-400 mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin ingresos fijos</h3>
                <p className="text-[var(--text-secondary)] mt-2">Agrega aqui tu salario, clientes recurrentes o ingresos pasivos.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-brand-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[var(--bg-main)] text-[var(--text-secondary)] text-sm font-medium uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Fuente</th>
                            <th className="px-6 py-4">Dia de cobro</th>
                            <th className="px-6 py-4">Monto</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Accion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100/50">
                        {incomes.map((income) => {
                            const status = monthlyStatus(income.due_day, income.last_received_date, 'Recibido');
                            const doneThisMonth = isDoneThisMonth(income.last_received_date);
                            return (
                                <tr key={income.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-[var(--text-primary)]">{income.name}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{income.auto_create ? 'Automatico' : 'Manual'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-[var(--text-secondary)]">Dia {income.due_day}</td>
                                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{formatMoney(income.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className="rounded-full border border-brand-200 bg-[var(--bg-main)] px-3 py-1 text-xs font-semibold text-brand-700">
                                            {sourceTypeLabel(income.source_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4"><StatusPill status={status} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!doneThisMonth && (
                                                <button
                                                    disabled={receiveMutation.isPending && receiveMutation.variables?.id === income.id}
                                                    onClick={() => onReceive(income)}
                                                    className="text-sm bg-brand-600 hover:bg-brand-700 text-white py-1.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                                                >
                                                    {receiveMutation.isPending && receiveMutation.variables?.id === income.id ? <Loader2 size={16} className="animate-spin" /> : 'Registrar ingreso'}
                                                </button>
                                            )}
                                            <button onClick={() => onEdit(income)} className="p-2 text-[var(--text-secondary)] hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(income)}
                                                disabled={deleteMutation.isPending}
                                                className="p-2 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                {deleteMutation.isPending && deleteMutation.variables === income.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ExpenseTable({
    expenses,
    onEdit,
    onDelete,
    onPay,
    payMutation,
    deleteMutation,
}: {
    expenses: RecurringExpense[];
    onEdit: (expense: RecurringExpense) => void;
    onDelete: (expense: RecurringExpense) => void;
    onPay: (expense: RecurringExpense) => void;
    payMutation: UseMutationResult<RecurringExpense, Error, { id: number; account_id: number | null }>;
    deleteMutation: UseMutationResult<unknown, Error, number>;
}) {
    if (expenses.length === 0) {
        return (
            <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                <CalendarClock size={48} className="mx-auto text-brand-400 mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin gastos fijos</h3>
                <p className="text-[var(--text-secondary)] mt-2">Agrega aqui renta, servicios, suscripciones o pagos domiciliados.</p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-brand-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-[var(--bg-main)] text-[var(--text-secondary)] text-sm font-medium uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Servicio / gasto</th>
                            <th className="px-6 py-4">Dia de cobro</th>
                            <th className="px-6 py-4">Costo estimado</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Accion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100/50">
                        {expenses.map((expense) => {
                            const status = monthlyStatus(expense.due_day, expense.last_paid_date, 'Pagado');
                            const doneThisMonth = isDoneThisMonth(expense.last_paid_date);
                            return (
                                <tr key={expense.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-[var(--text-primary)]">{expense.name}</p>
                                        {expense.account && <p className="text-xs text-[var(--text-secondary)]">Cuenta ID: {expense.account}</p>}
                                    </td>
                                    <td className="px-6 py-4 text-[var(--text-secondary)]">Dia {expense.due_day}</td>
                                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{formatMoney(expense.amount)}</td>
                                    <td className="px-6 py-4"><StatusPill status={status} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!doneThisMonth && (
                                                <button
                                                    disabled={payMutation.isPending && payMutation.variables?.id === expense.id}
                                                    onClick={() => onPay(expense)}
                                                    className="text-sm bg-brand-600 hover:bg-brand-700 text-white py-1.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                                                >
                                                    {payMutation.isPending && payMutation.variables?.id === expense.id ? <Loader2 size={16} className="animate-spin" /> : 'Registrar pago'}
                                                </button>
                                            )}
                                            <button onClick={() => onEdit(expense)} className="p-2 text-[var(--text-secondary)] hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(expense)}
                                                disabled={deleteMutation.isPending}
                                                className="p-2 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                {deleteMutation.isPending && deleteMutation.variables === expense.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RecurringExpenseForm({ expense, onSuccess }: { expense?: RecurringExpense, onSuccess: () => void }) {
    const [name, setName] = useState(expense?.name || '');
    const [amount, setAmount] = useState(expense?.amount || '');
    const [dueDay, setDueDay] = useState(expense?.due_day.toString() || '1');
    const [categoryId, setCategoryId] = useState<number | null>(expense?.category || null);
    const [accountId, setAccountId] = useState<number | null>(expense?.account || null);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: Partial<RecurringExpense>) =>
            expense
                ? financeService.updateRecurringExpense(expense.id, data)
                : financeService.createRecurringExpense(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        }
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            name,
            amount,
            due_day: parseInt(dueDay),
            category: categoryId,
            account: accountId,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 overflow-visible pb-24">
            <TextInput label="Nombre del gasto" value={name} onChange={setName} placeholder="Netflix, renta, Spotify..." />
            <AmountDayInputs amount={amount} setAmount={setAmount} dueDay={dueDay} setDueDay={setDueDay} amountLabel="Costo promedio" dayLabel="Dia de cobro" />

            <div className="z-[70] relative pb-2">
                <CategorySelector type="OUT" value={categoryId} onChange={setCategoryId} />
            </div>

            <div className="z-[60] relative pb-2 pt-2">
                <AccountSelector value={accountId} onChange={setAccountId} />
            </div>

            <SubmitBar pending={mutation.isPending} disabled={!name || !amount} label={expense ? 'Actualizar gasto fijo' : 'Guardar gasto fijo'} />
        </form>
    );
}

function RecurringIncomeForm({ income, onSuccess }: { income?: RecurringIncome, onSuccess: () => void }) {
    const [name, setName] = useState(income?.name || '');
    const [amount, setAmount] = useState(income?.amount || '');
    const [dueDay, setDueDay] = useState(income?.due_day.toString() || '1');
    const [categoryId, setCategoryId] = useState<number | null>(income?.category || null);
    const [accountId, setAccountId] = useState<number | null>(income?.account || null);
    const [sourceType, setSourceType] = useState<RecurringIncomeSourceType>(income?.source_type || 'ACTIVE');
    const [autoCreate, setAutoCreate] = useState(income?.auto_create ?? true);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: Partial<RecurringIncome>) =>
            income
                ? financeService.updateRecurringIncome(income.id, data)
                : financeService.createRecurringIncome(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-incomes'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        }
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate({
            name,
            amount,
            due_day: parseInt(dueDay),
            category: categoryId,
            account: accountId,
            source_type: sourceType,
            auto_create: autoCreate,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 overflow-visible pb-24">
            <TextInput label="Nombre de la fuente" value={name} onChange={setName} placeholder="Salario, cliente mensual, renta..." />
            <AmountDayInputs amount={amount} setAmount={setAmount} dueDay={dueDay} setDueDay={setDueDay} amountLabel="Ingreso esperado" dayLabel="Dia de cobro" />

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipo de ingreso</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['ACTIVE', 'PASSIVE', 'OTHER'] as RecurringIncomeSourceType[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setSourceType(type)}
                            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${sourceType === type ? 'bg-brand-700 text-white border-brand-700' : 'bg-[var(--bg-main)] text-[var(--text-primary)] border-brand-200 hover:bg-[var(--bg-hover)]'}`}
                        >
                            {sourceTypeLabel(type)}
                        </button>
                    ))}
                </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-brand-200 bg-[var(--bg-main)] px-4 py-3">
                <span>
                    <span className="block text-sm font-medium text-[var(--text-primary)]">Registrar automaticamente</span>
                    <span className="block text-xs text-[var(--text-secondary)]">El scheduler crea el ingreso cuando llegue el dia de cobro.</span>
                </span>
                <input
                    type="checkbox"
                    checked={autoCreate}
                    onChange={(event) => setAutoCreate(event.target.checked)}
                    className="h-5 w-5 accent-[var(--brand-700)]"
                />
            </label>

            <div className="z-[70] relative pb-2">
                <CategorySelector type="IN" value={categoryId} onChange={setCategoryId} />
            </div>

            <div className="z-[60] relative pb-2 pt-2">
                <AccountSelector label="Cuenta destino" value={accountId} onChange={setAccountId} />
            </div>

            <SubmitBar pending={mutation.isPending} disabled={!name || !amount} label={income ? 'Actualizar ingreso fijo' : 'Guardar ingreso fijo'} />
        </form>
    );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                placeholder={placeholder}
                required
            />
        </div>
    );
}

function AmountDayInputs({
    amount,
    setAmount,
    dueDay,
    setDueDay,
    amountLabel,
    dayLabel,
}: {
    amount: string;
    setAmount: (value: string) => void;
    dueDay: string;
    setDueDay: (value: string) => void;
    amountLabel: string;
    dayLabel: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{amountLabel}</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{dayLabel}</label>
                <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(event) => setDueDay(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    required
                />
            </div>
        </div>
    );
}

function SubmitBar({ pending, disabled, label }: { pending: boolean; disabled: boolean; label: string }) {
    return (
        <div className="absolute bottom-6 left-6 right-6 pt-4 bg-[var(--bg-secondary)] border-t border-brand-100 z-50">
            <button
                type="submit"
                disabled={pending || disabled}
                className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center shadow-sm disabled:opacity-50"
            >
                {pending ? <Loader2 className="animate-spin" /> : label}
            </button>
        </div>
    );
}
