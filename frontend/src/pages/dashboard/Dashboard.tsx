import { useState } from 'react';
import { PlusCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { Modal } from '../../components/ui/Modal';
import { TransactionForm } from '../../components/transactions/TransactionForm';

export function Dashboard() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: summary, isLoading } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    return (
        <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Resumen Financiero</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Controla tus ingresos y gastos</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
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
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2">Saldo Total</h2>
                        <p className="text-4xl font-bold text-[var(--text-primary)]">
                            ${Number(summary?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            Ingresos <TrendingUp size={16} className="text-brand-700" />
                        </h2>
                        <p className="text-4xl font-bold text-brand-700">
                            ${Number(summary?.total_income || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-sm border border-brand-200">
                        <h2 className="text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-2">
                            Gastos <TrendingDown size={16} className="text-brand-400" />
                        </h2>
                        <p className="text-4xl font-bold text-brand-400">
                            ${Number(summary?.total_expense || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </main>
            )}

            {/* Modal para formulario */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Registrar Movimiento"
            >
                <TransactionForm onSuccess={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
}
