import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { Plus, Check, Loader2 } from 'lucide-react';

interface CategorySelectorProps {
    type: 'IN' | 'OUT';
    value: number | null;
    onChange: (categoryId: number) => void;
}

export function CategorySelector({ type, value, onChange }: CategorySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetchear categorías
    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: financeService.getCategories
    });

    // Autofocus click outside logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Mutación para crear nueva
    const createMutation = useMutation({
        mutationFn: financeService.createCategory,
        onSuccess: (newCat) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            onChange(newCat.id);
            setSearch('');
            setIsOpen(false);
        }
    });

    // Filtrado 
    const filteredCategories = categories.filter(c =>
        c.type === type && c.name.toLowerCase().includes(search.toLowerCase())
    );
    const exactMatch = filteredCategories.find(c => c.name.toLowerCase() === search.toLowerCase());
    const selectedCat = categories.find(c => c.id === value);

    const handleCreate = () => {
        if (!search.trim()) return;
        createMutation.mutate({
            name: search.trim(),
            type,
            color: type === 'IN' ? '#97A97C' : '#87986A'
        });
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Categoría</label>

            <div
                onClick={() => setIsOpen(true)}
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-[var(--bg-main)] text-[var(--text-primary)] cursor-text flex items-center justify-between"
            >
                {isOpen ? (
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent outline-none w-full"
                        placeholder="Buscar o crear categoría..."
                    />
                ) : (
                    <span className={selectedCat ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                        {selectedCat ? selectedCat.name : 'Seleccionar categoría...'}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-2 bg-[var(--bg-secondary)] border border-brand-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-brand-500"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : (
                        <div className="py-2">
                            {filteredCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => { onChange(cat.id); setIsOpen(false); setSearch(''); }}
                                    className="w-full text-left px-4 py-2 hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors"
                                >
                                    <span className="text-[var(--text-primary)]">{cat.name}</span>
                                    {value === cat.id && <Check size={16} className="text-brand-700" />}
                                </button>
                            ))}

                            {search.trim() && !exactMatch && (
                                <button
                                    type="button"
                                    disabled={createMutation.isPending}
                                    onClick={handleCreate}
                                    className="w-full text-left px-4 py-3 border-t border-brand-100 hover:bg-[var(--bg-hover)] flex items-center gap-2 text-brand-700 font-medium transition-colors"
                                >
                                    {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    Crear "{search}"
                                </button>
                            )}

                            {!isLoading && filteredCategories.length === 0 && !search && (
                                <div className="p-4 text-center text-sm text-brand-400">
                                    No hay categorías de este tipo. Escribe para crear una.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
