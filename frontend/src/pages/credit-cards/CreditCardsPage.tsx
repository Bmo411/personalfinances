import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Pencil, PlusCircle, Trash2, Wallet2 } from 'lucide-react';
import { Account, financeService } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';

type CreditCardAccount = Account & { calculated_balance: number };

function money(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makeDate(year: number, month: number, day: number) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
}

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function formatDate(date: Date) {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function parseLocalDate(value: string) {
    return new Date(`${value}T00:00:00`);
}

function nextDateForDay(day: number | null, today: Date) {
    if (!day) return null;
    const currentMonthDate = makeDate(today.getFullYear(), today.getMonth(), day);
    if (currentMonthDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        return currentMonthDate;
    }
    return makeDate(today.getFullYear(), today.getMonth() + 1, day);
}

function daysUntil(date: Date | null, today: Date) {
    if (!date) return null;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.ceil((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getCycleWindow(cutDay: number | null, today: Date) {
    if (!cutDay) return null;

    const currentCut = makeDate(today.getFullYear(), today.getMonth(), cutDay);
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (todayOnly > currentCut) {
        return {
            start: addDays(currentCut, 1),
            end: makeDate(today.getFullYear(), today.getMonth() + 1, cutDay),
        };
    }

    const previousCut = makeDate(today.getFullYear(), today.getMonth() - 1, cutDay);
    return {
        start: addDays(previousCut, 1),
        end: currentCut,
    };
}

export function CreditCardsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CreditCardAccount | null>(null);
    const queryClient = useQueryClient();

    const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: financeService.getAccounts,
    });

    const { data: summary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary(),
    });

    const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
        queryKey: ['transactions', 'credit-cards'],
        queryFn: () => financeService.getTransactions(),
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const today = new Date();
    const creditCards: CreditCardAccount[] = accounts
        .filter((account) => account.type === 'CREDIT')
        .map((account) => {
            const summaryMatch = summary?.accounts?.find((item) => item.id === account.id);
            return {
                ...account,
                calculated_balance: Number(summaryMatch?.calculated_balance ?? account.balance),
            };
        });

    const totalDebt = creditCards.reduce((sum, card) => sum + Math.max(0, -card.calculated_balance), 0);
    const totalLimit = creditCards.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
    const totalAvailable = Math.max(0, totalLimit - totalDebt);
    const cycleTotal = creditCards.reduce((sum, card) => sum + getCycleSpend(card, transactions, today), 0);

    const loading = loadingAccounts || loadingTransactions;

    const handleDeleteCard = (card: CreditCardAccount, debt: number) => {
        if (debt > 0) {
            alert('Primero deja la deuda de la tarjeta en $0.00 antes de borrarla.');
            return;
        }

        const confirmed = window.confirm(
            `Borrar la tarjeta "${card.name}"? Sus movimientos se conservan en el historial, pero dejaran de estar asociados a esta tarjeta.`
        );

        if (confirmed) {
            deleteMutation.mutate(card.id);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Tarjetas de credito</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Controla deuda, limite, corte, pago y gasto del ciclo.</p>
                </div>

                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    <PlusCircle size={20} />
                    Nueva tarjeta
                </button>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium mb-2">
                        <CreditCard size={18} /> Deuda actual
                    </div>
                    <p className="text-3xl font-bold text-red-500">${money(totalDebt)}</p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium mb-2">
                        <Wallet2 size={18} /> Credito disponible
                    </div>
                    <p className="text-3xl font-bold text-brand-700">${money(totalAvailable)}</p>
                </div>
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium mb-2">
                        <CalendarClock size={18} /> Gasto ciclo actual
                    </div>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">${money(cycleTotal)}</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-6 shadow-sm border border-green-200 text-green-800">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <CheckCircle2 size={18} /> Liquidez
                    </div>
                    <p className="text-sm">El limite de credito no se suma a tu liquidez; solo se resta la deuda del patrimonio.</p>
                </div>
            </section>

            {loading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando tarjetas...</div>
            ) : creditCards.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <CreditCard size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin tarjetas registradas</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Agrega una tarjeta para separar deuda, fechas y credito disponible.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {creditCards.map((card) => {
                        const debt = Math.max(0, -card.calculated_balance);
                        const limit = Number(card.credit_limit || 0);
                        const available = Math.max(0, limit - debt);
                        const utilization = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
                        const nextCut = nextDateForDay(card.statement_cut_day, today);
                        const nextPayment = nextDateForDay(card.payment_due_day, today);
                        const cycleWindow = getCycleWindow(card.statement_cut_day, today);
                        const cycleSpend = getCycleSpend(card, transactions, today);
                        const cutDays = daysUntil(nextCut, today);
                        const paymentDays = daysUntil(nextPayment, today);

                        return (
                            <article key={card.id} className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                                <div className="flex items-start justify-between gap-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-brand-50 rounded-xl" style={{ color: card.color || '#97A97C' }}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-xl text-[var(--text-primary)]">{card.name}</h2>
                                            <p className="text-sm text-[var(--text-secondary)]">Corte {card.statement_cut_day || '-'} / Pago {card.payment_due_day || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditingCard(card)}
                                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-brand-50 hover:text-brand-700 transition-colors"
                                            title="Editar tarjeta"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCard(card, debt)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                            title="Borrar tarjeta"
                                        >
                                            {deleteMutation.isPending && deleteMutation.variables === card.id
                                                ? <Loader2 size={18} className="animate-spin" />
                                                : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">Deuda</p>
                                        <p className="text-2xl font-bold text-red-500">${money(debt)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-1">Disponible</p>
                                        <p className="text-2xl font-bold text-brand-700">${money(available)}</p>
                                    </div>
                                </div>

                                <div className="h-3 w-full bg-[var(--bg-main)] rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full bg-red-400 transition-all"
                                        style={{ width: `${utilization}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="bg-[var(--bg-main)] rounded-xl p-3">
                                        <p className="text-[var(--text-secondary)]">Limite</p>
                                        <p className="font-bold text-[var(--text-primary)]">${money(limit)}</p>
                                    </div>
                                    <div className="bg-[var(--bg-main)] rounded-xl p-3">
                                        <p className="text-[var(--text-secondary)]">Proximo corte</p>
                                        <p className="font-bold text-[var(--text-primary)]">{nextCut ? `${formatDate(nextCut)} (${cutDays}d)` : 'Sin fecha'}</p>
                                    </div>
                                    <div className="bg-[var(--bg-main)] rounded-xl p-3">
                                        <p className="text-[var(--text-secondary)]">Proximo pago</p>
                                        <p className="font-bold text-[var(--text-primary)]">{nextPayment ? `${formatDate(nextPayment)} (${paymentDays}d)` : 'Sin fecha'}</p>
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-brand-100 pt-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)]">Compras del ciclo</p>
                                        <p className="font-bold text-[var(--text-primary)]">${money(cycleSpend)}</p>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] text-right">
                                        {cycleWindow ? `${formatDate(cycleWindow.start)} - ${formatDate(cycleWindow.end)}` : 'Configura dia de corte'}
                                    </p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nueva tarjeta de credito">
                <CreditCardForm onSuccess={() => setIsFormOpen(false)} />
            </Modal>

            <Modal isOpen={!!editingCard} onClose={() => setEditingCard(null)} title="Editar tarjeta">
                {editingCard && (
                    <CreditCardForm
                        card={editingCard}
                        onSuccess={() => setEditingCard(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

function getCycleSpend(card: CreditCardAccount, transactions: Awaited<ReturnType<typeof financeService.getTransactions>>, today: Date) {
    const window = getCycleWindow(card.statement_cut_day, today);
    if (!window) return 0;

    return transactions
        .filter((transaction) => {
            if (transaction.account !== card.id || transaction.type !== 'OUT' || transaction.is_transfer) return false;
            const txDate = parseLocalDate(transaction.date);
            return txDate >= window.start && txDate <= window.end;
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function CreditCardForm({ card, onSuccess }: { card?: CreditCardAccount, onSuccess: () => void }) {
    const [name, setName] = useState(card?.name || '');
    const [creditLimit, setCreditLimit] = useState(card?.credit_limit || '');
    const [statementCutDay, setStatementCutDay] = useState(card?.statement_cut_day?.toString() || '');
    const [paymentDueDay, setPaymentDueDay] = useState(card?.payment_due_day?.toString() || '');
    const [color, setColor] = useState(card?.color || '#ef4444');

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => {
            const payload = {
                name,
                type: 'CREDIT' as const,
                color,
                credit_limit: creditLimit || '0',
                statement_cut_day: statementCutDay ? Number(statementCutDay) : null,
                payment_due_day: paymentDueDay ? Number(paymentDueDay) : null,
                balance: card?.balance || '0',
            };

            return card
                ? financeService.updateAccount(card.id, payload)
                : financeService.createAccount(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onSuccess();
        },
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre</label>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="BBVA Azul, Nu, Amex..."
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Limite de credito</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={creditLimit}
                    onChange={(event) => setCreditLimit(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Dia de corte</label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={statementCutDay}
                        onChange={(event) => setStatementCutDay(event.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                        placeholder="15"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Dia limite de pago</label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={paymentDueDay}
                        onChange={(event) => setPaymentDueDay(event.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                        placeholder="5"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Color</label>
                <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer"
                />
            </div>

            <button
                type="submit"
                disabled={mutation.isPending || !name}
                className="w-full mt-4 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : card ? 'Actualizar tarjeta' : 'Crear tarjeta'}
            </button>
        </form>
    );
}
