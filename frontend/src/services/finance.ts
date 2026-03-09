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
    type: 'CASH' | 'DEBIT' | 'CREDIT' | 'SAVINGS';
    balance: string;
    color: string;
    is_active: boolean;
    calculated_balance?: number; // Added from backend summary
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    whatsapp_phone: string | null;
    whatsapp_apikey: string | null;
    whatsapp_enabled: boolean;
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
    createTransfer: async (transferData: { from_account: number, to_account: number, amount: string, date: string, description?: string }) => {
        const { data } = await api.post('finance/transactions/transfer/', transferData);
        return data;
    },
    deleteTransaction: async (id: number) => {
        await api.delete(`finance/transactions/${id}/`);
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
    withdrawFundsFromSavings: async (id: number, amount: number, account_id: number) => {
        const { data } = await api.post(`finance/savings/${id}/withdraw_funds/`, { amount, account_id });
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
        const { data } = await api.patch(`finance/debts/${id}/`, debt);
        return data as Debt;
    },
    payDebt: async (id: number, payload: { amount: string, account_id: number }) => {
        const { data } = await api.post(`finance/debts/${id}/pay/`, payload);
        return data as Debt;
    },
    deleteDebt: async (id: number) => {
        const { data } = await api.delete(`finance/debts/${id}/`);
        return data;
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
    updateRecurringExpense: async (id: number, expense: Partial<RecurringExpense>) => {
        const { data } = await api.patch(`finance/recurring/${id}/`, expense);
        return data as RecurringExpense;
    },
    payRecurringExpense: async (id: number, date?: string, account_id?: number) => {
        const { data } = await api.post(`finance/recurring/${id}/pay/`, { date, account_id });
        return data as RecurringExpense;
    },

    // User Profile / WhatsApp Settings
    getUserProfile: async () => {
        const { data } = await api.get('users/profile/');
        return data as UserProfile;
    },
    updateUserProfile: async (profile: Partial<UserProfile>) => {
        const { data } = await api.patch('users/profile/', profile);
        return data as UserProfile;
    },
    sendWhatsAppTest: async (phone: string, apikey: string) => {
        const { data } = await api.post('users/whatsapp-test/', { phone, apikey });
        return data as { message?: string; error?: string };
    },
};
