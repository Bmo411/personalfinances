import { api } from './api';

export interface Category {
    id: number;
    name: string;
    type: 'IN' | 'OUT';
    color: string;
    icon?: string;
}

export interface Transaction {
    id: number;
    amount: string;
    type: 'IN' | 'OUT';
    date: string;
    category: number | null;
    category_name?: string;
    payment_method: 'CASH' | 'CARD' | 'TRANSFER';
    description?: string;
}

export interface SavingsGoal {
    id: number;
    name: string;
    target_amount: string;
    current_amount: string;
    target_date: string | null;
    color: string;
    is_completed: boolean;
}

export interface Debt {
    id: number;
    name: string;
    description: string | null;
    type: 'OWED_TO_ME' | 'I_OWE';
    total_amount: string;
    remaining_amount: string;
    due_date: string | null;
    is_settled: boolean;
}

export const financeService = {
    // Categorías
    getCategories: async () => {
        const { data } = await api.get('finance/categories/');
        return data as Category[];
    },
    createCategory: async (category: Partial<Category>) => {
        const { data } = await api.post('finance/categories/', category);
        return data as Category;
    },

    // Transacciones
    getTransactions: async (params?: any) => {
        const { data } = await api.get('finance/transactions/', { params });
        return data as Transaction[];
    },
    createTransaction: async (transaction: Partial<Transaction>) => {
        const { data } = await api.post('finance/transactions/', transaction);
        return data as Transaction;
    },

    // Dashboard Summary
    getSummary: async (month?: number, year?: number) => {
        const { data } = await api.get('finance/transactions/summary/', {
            params: { month, year }
        });
        return data;
    },

    // Ahorros
    getSavingsGoals: async () => {
        const { data } = await api.get('finance/savings/');
        return data as SavingsGoal[];
    },
    createSavingsGoal: async (goal: Partial<SavingsGoal>) => {
        const { data } = await api.post('finance/savings/', goal);
        return data as SavingsGoal;
    },
    addFundsToSavings: async (id: number, amount: number) => {
        const { data } = await api.post(`finance/savings/${id}/add_funds/`, { amount });
        return data as SavingsGoal;
    },

    // Deudas
    getDebts: async () => {
        const { data } = await api.get('finance/debts/');
        return data as Debt[];
    },
    createDebt: async (debt: Partial<Debt>) => {
        const { data } = await api.post('finance/debts/', debt);
        return data as Debt;
    },
    updateDebt: async (id: number, debt: Partial<Debt>) => {
        const { data } = await api.put(`finance/debts/${id}/`, debt);
        return data as Debt;
    }
};
