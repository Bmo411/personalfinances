import { api } from './api';

export interface Category {
    id: number;
    name: string;
    type: 'IN' | 'OUT';
    color: string;
    icon?: string;
}

export type SpendingKind = 'NECESSARY' | 'OUTING' | 'IMPULSE' | 'OPTIONAL';

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
    is_transfer?: boolean;
    spending_kind?: SpendingKind | null;
    credit_statement_date?: string | null;
    credit_due_date?: string | null;
}

export interface TransactionQueryParams {
    month?: number;
    year?: number;
    date_from?: string;
    date_to?: string;
}

export type SummaryQueryParams = TransactionQueryParams;

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
    credit_limit: string;
    statement_cut_day: number | null;
    payment_due_day: number | null;
    color: string;
    is_active: boolean;
    calculated_balance?: number; // Added from backend summary
}

export interface SummaryAccount extends Account {
    calculated_balance: number;
}

export interface SummaryCategoryTotal {
    category__name: string | null;
    category__color: string | null;
    total: string;
}

export interface Last7DaysExpense {
    date: string;
    total: string;
    categories: SummaryCategoryTotal[];
}

export interface EmergencyFundStatus {
    current: string;
    target: string;
    percent: string;
    months: string | null;
    days_of_freedom: number | null;
    source: string;
}

export interface SpendingBehavior {
    necessary: string;
    outing: string;
    impulse: string;
    optional: string;
    outing_budget: string;
    outing_remaining: string;
    days_without_impulse: number | null;
}

export interface ImportantPayment {
    date: string;
    label: string;
    amount: string;
    kind: 'RECURRING' | 'RECURRING_INCOME' | 'DEBT' | 'CREDIT_CARD' | 'START';
    direction?: 'IN' | 'OUT';
    balance_after?: string;
    statement_date?: string;
}

export interface CreditCardBucketTransaction {
    id: number;
    date: string;
    description: string | null;
    amount: string;
    credit_statement_date: string | null;
    credit_due_date: string | null;
    category_name: string | null;
}

export interface CreditCardBucket {
    statement_date: string | null;
    due_date: string;
    purchases_total: string;
    paid_total: string;
    pending: string;
    transactions: CreditCardBucketTransaction[];
}

export interface CreditCardBucketsResponse {
    card_id: number;
    buckets: CreditCardBucket[];
    next_bucket: CreditCardBucket | null;
    future_pending: string;
    unbucketed_total: string;
    unassigned_payment_remaining: string;
}

export interface NetWorthHistoryPoint {
    month: string;
    label: string;
    net_worth: string;
    cumulative_change: string;
}

export interface DebtProgress {
    id: number;
    name: string;
    total_amount: string;
    remaining_amount: string;
    paid_amount: string;
    percent: string;
    due_date: string | null;
}

export interface FinancialScore {
    total: number;
    components: {
        liquidity: number;
        debt: number;
        savings: number;
        net_worth: number;
        discipline: number;
    };
}

export interface FinancialLifeSnapshot {
    age: number | null;
    weekly_work_hours: number | null;
    current_goal: string;
    active_income_sources: number;
    passive_income_sources: number;
}

export interface FinanceSummary {
    balance: string;
    total_income: string;
    total_expense: string;
    credit_card_expense: string;
    liquid_balance: string;
    savings_balance: string;
    credit_card_debt: string;
    credit_available: string;
    net_worth: string;
    total_debt: string;
    payable_debt: string;
    receivable_debt: string;
    future_liquidity: string;
    emergency_fund: EmergencyFundStatus;
    spending_behavior: SpendingBehavior;
    upcoming_important_payment: ImportantPayment | null;
    cashflow_projection: ImportantPayment[];
    net_worth_history: NetWorthHistoryPoint[];
    debt_progress: DebtProgress[];
    financial_score: FinancialScore;
    days_of_freedom: number | null;
    financial_life: FinancialLifeSnapshot;
    expenses_by_category: SummaryCategoryTotal[];
    incomes_by_category: SummaryCategoryTotal[];
    accounts: SummaryAccount[];
    upcoming_fixed_expenses: string;
    upcoming_fixed_incomes: string;
    last_7_days_expenses: Last7DaysExpense[];
    expense_trend: Last7DaysExpense[];
    period: {
        mode: 'all' | 'month' | 'range';
        date_from: string;
        date_to: string;
    };
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

export type RecurringIncomeSourceType = 'ACTIVE' | 'PASSIVE' | 'OTHER';

export interface RecurringIncome {
    id: number;
    name: string;
    amount: string;
    category: number | null;
    account: number | null;
    due_day: number;
    source_type: RecurringIncomeSourceType;
    auto_create: boolean;
    is_active: boolean;
    last_received_date: string | null;
}

export interface FinancialProfile {
    id: number;
    age: number | null;
    emergency_fund_goal: string;
    monthly_outing_budget: string;
    weekly_work_hours: number | null;
    current_goal: string;
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
    getTransactions: async (params?: TransactionQueryParams) => {
        const { data } = await api.get('finance/transactions/', { params });
        return data as Transaction[];
    },
    createTransaction: async (transaction: Partial<Transaction>) => {
        const { data } = await api.post('finance/transactions/', transaction);
        return data as Transaction;
    },
    updateTransaction: async (id: number, transaction: Partial<Transaction>) => {
        const { data } = await api.patch(`finance/transactions/${id}/`, transaction);
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
    getSummary: async (params?: SummaryQueryParams) => {
        const { data } = await api.get('finance/transactions/summary/', {
            params
        });
        return data as FinanceSummary;
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
        const { data } = await api.patch(`finance/accounts/${id}/`, account);
        return data as Account;
    },
    deleteAccount: async (id: number) => {
        await api.delete(`finance/accounts/${id}/`);
    },
    reconcileAccount: async (id: number, actualBalance: number, notes: string) => {
        const { data } = await api.post(`finance/accounts/${id}/reconcile/`, {
            actual_balance: actualBalance,
            notes
        });
        return data;
    },
    getCreditCardBuckets: async (id: number) => {
        const { data } = await api.get(`finance/accounts/${id}/credit_buckets/`);
        return data as CreditCardBucketsResponse;
    },
    payCreditStatement: async (id: number, payload: { source_account_id: number; due_date: string; amount?: string; date?: string }) => {
        const { data } = await api.post(`finance/accounts/${id}/pay_credit_statement/`, payload);
        return data as CreditCardBucketsResponse;
    },
    payCreditAmount: async (id: number, payload: { source_account_id: number; amount: string; date?: string }) => {
        const { data } = await api.post(`finance/accounts/${id}/pay_credit_amount/`, payload);
        return data as CreditCardBucketsResponse;
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

    // Ingresos Fijos
    getRecurringIncomes: async () => {
        const { data } = await api.get('finance/recurring-incomes/');
        return data as RecurringIncome[];
    },
    createRecurringIncome: async (income: Partial<RecurringIncome>) => {
        const { data } = await api.post('finance/recurring-incomes/', income);
        return data as RecurringIncome;
    },
    deleteRecurringIncome: async (id: number) => {
        const { data } = await api.delete(`finance/recurring-incomes/${id}/`);
        return data;
    },
    updateRecurringIncome: async (id: number, income: Partial<RecurringIncome>) => {
        const { data } = await api.patch(`finance/recurring-incomes/${id}/`, income);
        return data as RecurringIncome;
    },
    receiveRecurringIncome: async (id: number, date?: string, account_id?: number) => {
        const { data } = await api.post(`finance/recurring-incomes/${id}/receive/`, { date, account_id });
        return data as RecurringIncome;
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

    // Financial Profile / behavior settings
    getFinancialProfile: async () => {
        const { data } = await api.get('finance/financial-profile/me/');
        return data as FinancialProfile;
    },
    updateFinancialProfile: async (profile: Partial<FinancialProfile>) => {
        const { data } = await api.patch('finance/financial-profile/me/', profile);
        return data as FinancialProfile;
    },
};
