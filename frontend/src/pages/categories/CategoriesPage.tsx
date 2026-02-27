import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PlusCircle, Tag, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export function CategoriesPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'OUT' | 'IN'>('OUT');

    const { data: categories = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: financeService.getCategories
    });

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    const filteredCategories = categories.filter(c => c.type === activeTab);

    // For PieChart
    const expensesData = summary?.expenses_by_category?.map((item: any) => ({
        name: item.category__name || 'General',
        value: Number(item.total),
        color: item.category__color || '#9ca3af'
    })) || [];

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Categorías</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Administra la clasificación de tus movimientos</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                >
                    <PlusCircle size={20} />
                    Nueva Categoría
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Chart Section */}
                <div className="lg:col-span-1 bg-[var(--bg-secondary)] p-6 rounded-2xl border border-brand-200 shadow-sm flex flex-col min-h-[400px]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Gastos por Categoría</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">Distribución de tus egresos históricos</p>

                    {loadingSummary ? (
                        <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">Cargando gráfico...</div>
                    ) : expensesData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-brand-400">
                            <Tag size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">No hay suficientes egresos registrados.</p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expensesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {expensesData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total']}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid var(--brand-200)' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* List Section */}
                <div className="lg:col-span-2">
                    <div className="bg-[var(--bg-secondary)] rounded-2xl border border-brand-200 shadow-sm overflow-hidden">

                        <div className="flex border-b border-brand-100 p-2">
                            <button
                                onClick={() => setActiveTab('OUT')}
                                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${activeTab === 'OUT' ? 'bg-red-50 text-red-600' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                            >
                                <TrendingDown size={18} /> Egresos
                            </button>
                            <button
                                onClick={() => setActiveTab('IN')}
                                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${activeTab === 'IN' ? 'bg-brand-50 text-brand-600' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                            >
                                <TrendingUp size={18} /> Ingresos
                            </button>
                        </div>

                        <div className="p-4 md:p-6">
                            {loadingCategories ? (
                                <div className="py-12 text-center text-[var(--text-secondary)]">Cargando categorías...</div>
                            ) : filteredCategories.length === 0 ? (
                                <div className="py-12 text-center text-[var(--text-secondary)] border border-dashed border-brand-200 rounded-xl">
                                    No tienes categorías de este tipo creadas.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredCategories.map(cat => {
                                        // To handle dynamic hover colors in React without inline hover, we use a custom property
                                        // and a small utility class trick or simple inline style for the border.
                                        return (
                                            <div
                                                key={cat.id}
                                                className="group flex items-center justify-between p-4 rounded-xl border transition-all bg-[var(--bg-main)]"
                                                style={{
                                                    borderColor: 'var(--brand-100)',
                                                    // CSS variable used to style on hover via Tailwind
                                                    '--hover-border': cat.color || '#9ca3af',
                                                    '--hover-bg': `${cat.color}15` || '#f3f4f6' // 15 is hex opacity (approx 8%)
                                                } as React.CSSProperties}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = cat.color || '#9ca3af';
                                                    e.currentTarget.style.backgroundColor = `${cat.color}15` || '#f3f4f6';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--brand-100)';
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                                                }}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                                                        style={{ backgroundColor: cat.color || '#9ca3af' }}
                                                    >
                                                        {cat.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="font-medium text-[var(--text-primary)] group-hover:text-brand-900 transition-colors">{cat.name}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nueva Categoría">
                <CreateCategoryForm onSuccess={() => setIsAddModalOpen(false)} initialType={activeTab} />
            </Modal>
        </div>
    );
}

function CreateCategoryForm({ onSuccess, initialType }: { onSuccess: () => void, initialType: 'IN' | 'OUT' }) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'IN' | 'OUT'>(initialType);
    const [color, setColor] = useState('#6366f1');

    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: financeService.createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            onSuccess();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ name, type, color });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl mb-4">
                <button
                    type="button"
                    onClick={() => setType('OUT')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'OUT' ? 'bg-[var(--bg-secondary)] text-red-600 shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'}`}
                >
                    Para Egresos
                </button>
                <button
                    type="button"
                    onClick={() => setType('IN')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${type === 'IN' ? 'bg-[var(--bg-secondary)] text-brand-600 shadow-sm' : 'text-brand-700 hover:text-[var(--text-primary)]'}`}
                >
                    Para Ingresos
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre de la Categoría</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)]"
                    placeholder="Ej. Comida, Transporte, Sueldo..."
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Color (opcional)</label>
                <div className="flex items-center gap-4">
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">{color}</span>
                </div>
            </div>

            <button
                type="submit"
                disabled={mutation.isPending || !name}
                className="w-full mt-6 bg-brand-700 hover:bg-brand-900 text-white font-medium py-3 rounded-xl flex justify-center disabled:opacity-50"
            >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Guardar Categoría'}
            </button>
        </form>
    );
}
