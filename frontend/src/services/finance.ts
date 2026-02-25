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
    account: number | null;
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

export interface Account {
    id: number;
    name: string;
    type: 'CASH' | 'DEBIT' | 'CREDIT';
    balance: string;
    color: string;
    is_active: boolean;
    calculated_balance?: number; // Added from backend summary
}

export interface RecurringExpense {
    id: number;
    name: string;
    amount: string;
    category: number | null;
    account: number | null;
    due_day: number;
    is_active: boolean;
    last_paid_date: string | null;
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
    addFundsToSavings: async (id: number, amount: number, account_id: number) => {
        const { data } = await api.post(`finance/savings/${id}/add_funds/`, { amount, account_id });
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
    },

    // Cuentas / Billeteras
    getAccounts: async () => {
        const { data } = await api.get('finance/accounts/');
        return data as Account[];
    },
    createAccount: async (account: Partial<Account>) => {
        const { data } = await api.post('finance/accounts/', account);
        return data as Account;
    },
    updateAccount: async (id: number, account: Partial<Account>) => {
        const { data } = await api.put(`finance/accounts/${id}/`, account);
        return data as Account;
    },

    // Gastos Fijos (Recurring)
    getRecurringExpenses: async () => {
        const { data } = await api.get('finance/recurring/');
        return data as RecurringExpense[];
    },
    createRecurringExpense: async (expense: Partial<RecurringExpense>) => {
        const { data } = await api.post('finance/recurring/', expense);
        return data as RecurringExpense;
    },
    deleteRecurringExpense: async (id: number) => {
        const { data } = await api.delete(`finance/recurring/${id}/`);
        return data;
    },
    payRecurringExpense: async (id: number, date?: string, account_id?: number) => {
        const { data } = await api.post(`finance/recurring/${id}/pay/`, { date, account_id });
        return data as RecurringExpense;
    }
};
