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
    }
};
