import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { Dashboard } from './pages/dashboard/Dashboard'
import { FinancialLifePage } from './pages/financial-life/FinancialLifePage';
import { PreferencesPage } from './pages/preferences/PreferencesPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { CreditCardsPage } from './pages/credit-cards/CreditCardsPage';
import { SavingsPage } from './pages/savings/SavingsPage';
import { DebtsPage } from './pages/debts/DebtsPage';
import { RecurringPage } from './pages/recurring/RecurringPage';

import { HistoryPage } from './pages/history/HistoryPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/financial-life" element={<FinancialLifePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/credit-cards" element={<CreditCardsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/debts" element={<DebtsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
