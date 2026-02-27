import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '../../services/finance';
import { Plus, Check, Loader2, Wallet } from 'lucide-react';

interface AccountSelectorProps {
    value: number | null;
    onChange: (accountId: number) => void;
}

export function AccountSelector({ value, onChange }: AccountSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: financeService.getAccounts
    });

    const { data: summary } = useQuery({
        queryKey: ['summary'],
        queryFn: () => financeService.getSummary()
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const createMutation = useMutation({
        mutationFn: financeService.createAccount,
        onSuccess: (newAcc) => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onChange(newAcc.id);
            setSearch('');
            setIsOpen(false);
        }
    });

    const enrichedAccounts = accounts.map(acc => {
        const summaryMatch = summary?.accounts?.find((s: any) => s.id === acc.id);
        return {
            ...acc,
            calculated_balance: summaryMatch?.calculated_balance ?? acc.balance
        };
    });

    const filteredAccounts = enrichedAccounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );
    const exactMatch = filteredAccounts.find(a => a.name.toLowerCase() === search.toLowerCase());
    const selectedAcc = enrichedAccounts.find(a => a.id === value);

    const handleCreate = () => {
        if (!search.trim()) return;
        createMutation.mutate({
            name: search.trim(),
            type: 'DEBIT', // Defaulting to DEBIT when quick-created
            color: '#0284c7'
        });
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                <Wallet size={16} /> Cuenta / Origen
            </label>

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
                        placeholder="Buscar o crear cuenta..."
                    />
                ) : (
                    <span className={selectedAcc ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                        {selectedAcc ? `${selectedAcc.name} ($${Number(selectedAcc.calculated_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : 'Seleccionar cuenta...'}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-2 bg-[var(--bg-secondary)] border border-brand-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-brand-500"><Loader2 className="animate-spin mx-auto" /></div>
                    ) : (
                        <div className="py-2">
                            {filteredAccounts.map(acc => (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => { onChange(acc.id); setIsOpen(false); setSearch(''); }}
                                    className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] flex items-center justify-between transition-colors border-b border-brand-50 last:border-0"
                                >
                                    <div>
                                        <div className="text-[var(--text-primary)] font-medium">{acc.name}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">{acc.type === 'CASH' ? 'Efectivo' : (acc.type === 'CREDIT' ? 'Crédito' : (acc.type === 'SAVINGS' ? 'Ahorro' : 'Banco'))} • ${Number(acc.calculated_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    {value === acc.id && <Check size={16} className="text-brand-700" />}
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
                                    Crear cuenta "{search}"
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
