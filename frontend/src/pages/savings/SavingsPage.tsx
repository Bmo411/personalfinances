import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { PlusCircle, Target, Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useThemeStore } from '../../store/themeStore';

export function SavingsPage() {
    const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
    const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

    const queryClient = useQueryClient();
    const { theme } = useThemeStore();

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['savings'],
        queryFn: financeService.getSavingsGoals
    });

    const { data: summary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.current_amount), 0);
    const availableBalance = Number(summary?.balance || 0);

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Metas de Ahorro</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Protege tu dinero separándolo de tu saldo disponible
                    </p>
                </div>

                <button
                    onClick={() => setIsAddGoalModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                    <PlusCircle size={20} />
                    Nueva Meta
                </button>
            </header>

            {/* Resumen Superior */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 flex items-center gap-4">
                    <div className="p-4 bg-brand-50 rounded-full text-brand-700">
                        <Target size={32} />
                    </div>
                    <div>
                        <h2 className="text-[var(--text-secondary)] font-medium">Ahorro Total Acumulado</h2>
                        <p className="text-4xl font-bold text-[var(--text-primary)]">
                            ${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 flex flex-col justify-center">
                    <h2 className="text-[var(--text-secondary)] font-medium">Restante para Gastos (Disponible)</h2>
                    <p className="text-3xl font-bold text-brand-700">
                        ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Este es el dinero de tus ingresos que aún no has gastado ni apartado.
                    </p>
                </div>
            </div>

            {/* Lista de Metas */}
            {isLoading ? (
                <div className="flex justify-center py-20 text-[var(--text-secondary)]">Cargando metas...</div>
            ) : goals.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-brand-200">
                    <Target size={48} className="mx-auto text-brand-400 mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">Sin metas de ahorro</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Crea tu primera meta para empezar a apartar dinero.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => {
                        const current = Number(goal.current_amount);
                        const target = Number(goal.target_amount);
                        const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;

                        return (
                            <div key={goal.id} className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200 relative overflow-hidden group">
                                {goal.is_completed && (
                                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                                        ¡Completada!
                                    </div>
                                )}

                                <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">{goal.name}</h3>

                                <div className="mt-4 mb-2 flex justify-between items-end">
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">
                                        ${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        de ${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>

                                {/* Barra de Progreso */}
                                <div className="h-3 w-full bg-[var(--bg-main)] rounded-full overflow-hidden mb-4">
                                    <div
                                        className="h-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: goal.is_completed ? '#eab308' : goal.color || '#97A97C'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedGoalId(goal.id);
                                        setIsAddFundsModalOpen(true);
                                    }}
                                    disabled={goal.is_completed}
                                    className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                                >
                                    <ArrowRight size={16} /> Aportar a meta
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modals placeholders for now */}
            <Modal isOpen={isAddGoalModalOpen} onClose={() => setIsAddGoalModalOpen(false)} title="Nueva Meta de Ahorro">
                <CreateGoalForm onSuccess={() => setIsAddGoalModalOpen(false)} />
            </Modal>

            <Modal isOpen={isAddFundsModalOpen} onClose={() => { setIsAddFundsModalOpen(false); setSelectedGoalId(null); }} title="Aportar a Meta">
                {selectedGoalId && (
                    <AddFundsForm
                        goalId={selectedGoalId}
                        availableBalance={availableBalance}
                        onSuccess={() => { setIsAddFundsModalOpen(false); setSelectedGoalId(null); }}
                    />
                )}
            </Modal>
        </div>
    );
}

// Inline components for forms to keep the file self-contained for scaffolding
function CreateGoalForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: financeService.createSavingsGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savings'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ name, target_amount: target });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre o Motivo</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Ej: Tenis nuevos, Viaje..."
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Meta a alcanzar ($)</label>
                <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="1000.00"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full mt-4 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Crear Meta'}
            </button>
        </form>
    );
}

function AddFundsForm({ goalId, availableBalance, onSuccess }: { goalId: number, availableBalance: number, onSuccess: () => void }) {
    const [amount, setAmount] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({ id, amt }: { id: number, amt: number }) => financeService.addFundsToSavings(id, amt),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savings'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Because we auto-create an expense
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ id: goalId, amt: Number(amount) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                El dinero aportado se descontará de tu Saldo Disponible principal, registrando un egreso automático a nombre de esta meta.
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Monto a aportar
                    <span className="text-xs ml-2 opacity-70">(Max disp: ${availableBalance})</span>
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={availableBalance > 0 ? availableBalance : undefined}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="0.00"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={mutation.isPending || Number(amount) > availableBalance}
                className="w-full mt-4 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Transferir a Meta'}
            </button>
        </form>
    );
}
