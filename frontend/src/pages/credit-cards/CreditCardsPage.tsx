import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, CreditCard, Loader2, Pencil, PlusCircle, Trash2, Wallet2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Account, CreditCardBucket, CreditCardBucketTransaction, financeService } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';

type CreditCardAccount = Account & { calculated_balance: number };
type PaymentTarget =
    | { mode: 'statement'; card: CreditCardAccount; bucket: CreditCardBucket }
    | { mode: 'free'; card: CreditCardAccount };
type AdjustmentTarget = { card: CreditCardAccount; transaction: CreditCardBucketTransaction };

function money(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
    if (!value) return 'Sin fecha';
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CreditCardsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CreditCardAccount | null>(null);
    const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
    const [adjustmentTarget, setAdjustmentTarget] = useState<AdjustmentTarget | null>(null);
    const queryClient = useQueryClient();

    const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
        queryKey: ['accounts'],
        queryFn: financeService.getAccounts,
    });

    const { data: summary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary(),
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteAccount,
        onSuccess: () => {
            invalidateCreditCards(queryClient);
        },
    });

    const creditCards: CreditCardAccount[] = useMemo(() => accounts
        .filter((account) => account.type === 'CREDIT')
        .map((account) => {
            const summaryMatch = summary?.accounts?.find((item) => item.id === account.id);
            return {
                ...account,
                calculated_balance: Number(summaryMatch?.calculated_balance ?? account.balance),
            };
        }), [accounts, summary]);

    const bucketQueries = useQueries({
        queries: creditCards.map((card) => ({
            queryKey: ['credit-card-buckets', card.id],
            queryFn: () => financeService.getCreditCardBuckets(card.id),
            enabled: Boolean(card.id),
        })),
    });

    const bucketByCard = new Map(creditCards.map((card, index) => [card.id, bucketQueries[index]?.data]));
    const sourceAccounts = accounts.filter((account) => account.type !== 'CREDIT' && account.is_active);

    const totalDebt = creditCards.reduce((sum, card) => sum + Math.max(0, -card.calculated_balance), 0);
    const totalLimit = creditCards.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
    const totalAvailable = Math.max(0, totalLimit - totalDebt);
    const totalNextPayment = creditCards.reduce((sum, card) => sum + Number(bucketByCard.get(card.id)?.next_bucket?.pending || 0), 0);
    const totalFuturePending = creditCards.reduce((sum, card) => sum + Number(bucketByCard.get(card.id)?.future_pending || 0), 0);
    const loadingBuckets = bucketQueries.some((query) => query.isLoading);
    const loading = loadingAccounts || loadingBuckets;

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
                    <p className="text-[var(--text-secondary)] mt-1">Controla estados, pagos reales, compras futuras y credito disponible.</p>
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
                <SummaryCard icon={CreditCard} label="Deuda total" value={`$${money(totalDebt)}`} tone="red" />
                <SummaryCard icon={Wallet2} label="Credito disponible" value={`$${money(totalAvailable)}`} tone="brand" />
                <SummaryCard icon={CalendarClock} label="Proximo pago real" value={`$${money(totalNextPayment)}`} />
                <div className="bg-green-50 rounded-2xl p-6 shadow-sm border border-green-200 text-green-800">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <CheckCircle2 size={18} /> Compras futuras
                    </div>
                    <p className="text-3xl font-bold">${money(totalFuturePending)}</p>
                    <p className="text-xs mt-2">Compras que vencen despues del proximo pago.</p>
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
                <div className="grid grid-cols-1 gap-6">
                    {creditCards.map((card) => {
                        const debt = Math.max(0, -card.calculated_balance);
                        const limit = Number(card.credit_limit || 0);
                        const available = Math.max(0, limit - debt);
                        const utilization = limit > 0 ? Math.min(100, (debt / limit) * 100) : 0;
                        const bucketData = bucketByCard.get(card.id);
                        const nextBucket = bucketData?.next_bucket;
                        const futurePending = Number(bucketData?.future_pending || 0);

                        return (
                            <article key={card.id} className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-brand-50 rounded-xl" style={{ color: card.color || '#97A97C' }}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-xl text-[var(--text-primary)]">{card.name}</h2>
                                            <p className="text-sm text-[var(--text-secondary)]">Corte {card.statement_cut_day || '-'} / Pago {card.payment_due_day || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => setPaymentTarget({ mode: 'free', card })}
                                            className="px-3 py-2 rounded-lg border border-brand-200 text-sm font-medium text-brand-700 hover:bg-[var(--bg-hover)] transition-colors"
                                        >
                                            Abono libre
                                        </button>
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

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                    <CardMetric label="Deuda" value={`$${money(debt)}`} className="text-red-500" />
                                    <CardMetric label="Disponible" value={`$${money(available)}`} className="text-brand-700" />
                                    <CardMetric label="Proximo pago" value={`$${money(Number(nextBucket?.pending || 0))}`} className="text-[var(--text-primary)]" />
                                    <CardMetric label="Futuro" value={`$${money(futurePending)}`} className="text-[var(--text-primary)]" />
                                </div>

                                <div className="h-3 w-full bg-[var(--bg-main)] rounded-full overflow-hidden mb-5">
                                    <div
                                        className="h-full bg-red-400 transition-all"
                                        style={{ width: `${utilization}%` }}
                                    />
                                </div>

                                {!card.statement_cut_day || !card.payment_due_day ? (
                                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                                        Configura dia de corte y dia limite de pago para calcular estados.
                                    </div>
                                ) : !bucketData || bucketData.buckets.length === 0 ? (
                                    <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                                        No hay compras con estado de cuenta para esta tarjeta.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {bucketData.buckets.map((bucket) => (
                                            <BucketRow
                                                key={`${card.id}-${bucket.due_date}`}
                                                card={card}
                                                bucket={bucket}
                                                onPay={() => setPaymentTarget({ mode: 'statement', card, bucket })}
                                                onAdjust={(transaction) => setAdjustmentTarget({ card, transaction })}
                                            />
                                        ))}
                                    </div>
                                )}
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

            <Modal isOpen={!!paymentTarget} onClose={() => setPaymentTarget(null)} title={paymentTarget?.mode === 'statement' ? 'Pagar estado' : 'Abono libre'}>
                {paymentTarget && (
                    <CreditPaymentForm
                        target={paymentTarget}
                        sourceAccounts={sourceAccounts}
                        onSuccess={() => setPaymentTarget(null)}
                    />
                )}
            </Modal>

            <Modal isOpen={!!adjustmentTarget} onClose={() => setAdjustmentTarget(null)} title="Ajustar fecha de pago">
                {adjustmentTarget && (
                    <AdjustDueDateForm
                        target={adjustmentTarget}
                        onSuccess={() => setAdjustmentTarget(null)}
                    />
                )}
            </Modal>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: 'red' | 'brand' }) {
    const valueClass = tone === 'red' ? 'text-red-500' : tone === 'brand' ? 'text-brand-700' : 'text-[var(--text-primary)]';
    return (
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium mb-2">
                <Icon size={18} /> {label}
            </div>
            <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
        </div>
    );
}

function CardMetric({ label, value, className }: { label: string; value: string; className: string }) {
    return (
        <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${className}`}>{value}</p>
        </div>
    );
}

function BucketRow({
    card,
    bucket,
    onPay,
    onAdjust,
}: {
    card: CreditCardAccount;
    bucket: CreditCardBucket;
    onPay: () => void;
    onAdjust: (transaction: CreditCardBucketTransaction) => void;
}) {
    const pending = Number(bucket.pending || 0);
    return (
        <div className="rounded-xl border border-brand-100 bg-[var(--bg-main)] p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Corte</p>
                    <p className="font-semibold text-[var(--text-primary)]">{formatDate(bucket.statement_date)}</p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Vence</p>
                    <p className="font-semibold text-[var(--text-primary)]">{formatDate(bucket.due_date)}</p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Compras</p>
                    <p className="font-semibold text-[var(--text-primary)]">${money(Number(bucket.purchases_total || 0))}</p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Pagado / pendiente</p>
                    <p className="font-semibold text-[var(--text-primary)]">${money(Number(bucket.paid_total || 0))} / ${money(pending)}</p>
                </div>
                <div className="flex justify-start md:justify-end">
                    <button
                        onClick={onPay}
                        disabled={pending <= 0}
                        className="px-3 py-2 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Pagar estado
                    </button>
                </div>
            </div>

            {bucket.transactions.length > 0 && (
                <div className="mt-4 space-y-2">
                    {bucket.transactions.map((transaction) => (
                        <div key={`${card.id}-${transaction.id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-[var(--bg-secondary)] border border-brand-100 px-3 py-2">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">{transaction.description || 'Compra con tarjeta'}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{formatDate(transaction.date)} - vence {formatDate(transaction.credit_due_date)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-[var(--text-primary)]">${money(Number(transaction.amount || 0))}</span>
                                <button
                                    onClick={() => onAdjust(transaction)}
                                    className="text-xs font-semibold text-brand-700 hover:text-brand-900"
                                >
                                    Ajustar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CreditPaymentForm({ target, sourceAccounts, onSuccess }: { target: PaymentTarget; sourceAccounts: Account[]; onSuccess: () => void }) {
    const [sourceAccountId, setSourceAccountId] = useState(sourceAccounts[0]?.id ? String(sourceAccounts[0].id) : '');
    const [amount, setAmount] = useState(target.mode === 'statement' ? target.bucket.pending : '');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => {
            const source_account_id = Number(sourceAccountId);
            if (target.mode === 'statement') {
                return financeService.payCreditStatement(target.card.id, {
                    source_account_id,
                    due_date: target.bucket.due_date,
                    amount,
                });
            }
            return financeService.payCreditAmount(target.card.id, {
                source_account_id,
                amount,
            });
        },
        onSuccess: () => {
            invalidateCreditCards(queryClient);
            onSuccess();
        },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {target.mode === 'statement' && (
                <div className="rounded-xl border border-brand-200 bg-[var(--bg-main)] px-4 py-3">
                    <p className="text-sm text-[var(--text-secondary)]">Estado de cuenta</p>
                <p className="font-semibold text-[var(--text-primary)]">Vence {formatDate(target.bucket.due_date)} - pendiente ${money(Number(target.bucket.pending || 0))}</p>
                </div>
            )}

            <label className="block">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Cuenta origen</span>
                <select
                    value={sourceAccountId}
                    onChange={(event) => setSourceAccountId(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    required
                >
                    {sourceAccounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                </select>
            </label>

            <label className="block">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monto</span>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    required
                />
            </label>

            <button
                type="submit"
                disabled={mutation.isPending || !sourceAccountId || !amount}
                className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : target.mode === 'statement' ? 'Pagar estado' : 'Registrar abono'}
            </button>
        </form>
    );
}

function AdjustDueDateForm({ target, onSuccess }: { target: AdjustmentTarget; onSuccess: () => void }) {
    const [dueDate, setDueDate] = useState(target.transaction.credit_due_date || '');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => financeService.updateTransaction(target.transaction.id, { credit_due_date: dueDate || null }),
        onSuccess: () => {
            invalidateCreditCards(queryClient);
            onSuccess();
        },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-[var(--bg-main)] px-4 py-3">
                <p className="text-sm text-[var(--text-secondary)]">Compra</p>
                <p className="font-semibold text-[var(--text-primary)]">{target.transaction.description || 'Compra con tarjeta'} - ${money(Number(target.transaction.amount || 0))}</p>
            </div>

            <label className="block">
                <span className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nueva fecha de pago</span>
                <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    required
                />
            </label>

            <button
                type="submit"
                disabled={mutation.isPending || !dueDate}
                className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar ajuste'}
            </button>
        </form>
    );
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
            invalidateCreditCards(queryClient);
            onSuccess();
        },
    });

    const handleSubmit = (event: FormEvent) => {
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
                        placeholder="20"
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
                        placeholder="10"
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

function invalidateCreditCards(queryClient: QueryClient) {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['credit-card-buckets'] });
}
