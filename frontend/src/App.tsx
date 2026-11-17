import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Login } from './pages/auth/Login'
const Register = lazy(() => import('./pages/auth/Register').then(module => ({ default: module.Register })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const FinancialLifePage = lazy(() => import('./pages/financial-life/FinancialLifePage').then(module => ({ default: module.FinancialLifePage })));
const PreferencesPage = lazy(() => import('./pages/preferences/PreferencesPage').then(module => ({ default: module.PreferencesPage })));
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage').then(module => ({ default: module.AccountsPage })));
const CreditCardsPage = lazy(() => import('./pages/credit-cards/CreditCardsPage').then(module => ({ default: module.CreditCardsPage })));
const MonthPage = lazy(() => import('./pages/month/MonthPage').then(module => ({ default: module.MonthPage })));
const SavingsPage = lazy(() => import('./pages/savings/SavingsPage').then(module => ({ default: module.SavingsPage })));
const DebtsPage = lazy(() => import('./pages/debts/DebtsPage').then(module => ({ default: module.DebtsPage })));
const RecurringPage = lazy(() => import('./pages/recurring/RecurringPage').then(module => ({ default: module.RecurringPage })));

const HistoryPage = lazy(() => import('./pages/history/HistoryPage').then(module => ({ default: module.HistoryPage })));
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage').then(module => ({ default: module.CategoriesPage })));
import { TodayPage } from './pages/guide/TodayPage';
const RecordsPage = lazy(() => import('./pages/guide/RecordsPage').then(module => ({ default: module.RecordsPage })));
const MathPage = lazy(() => import('./pages/guide/MathPage').then(module => ({ default: module.MathPage })));
const MeditationPage = lazy(() => import('./pages/guide/MeditationPage').then(module => ({ default: module.MeditationPage })));
const IntegrationsPage = lazy(() => import('./pages/guide/IntegrationsPage').then(module => ({ default: module.IntegrationsPage })));
const ImportsPage = lazy(() => import('./pages/guide/ImportsPage').then(module => ({ default: module.ImportsPage })));

function App() {
  return (
    <Suspense fallback={<div role="status" className="p-8 text-muted">Cargando…</div>}><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/finance" element={<Dashboard />} />
          <Route path="/organization" element={<RecordsPage mode="organization" />} />
          <Route path="/health" element={<RecordsPage mode="health" />} />
          <Route path="/math" element={<MathPage />} />
          <Route path="/meditation" element={<MeditationPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/financial-life" element={<FinancialLifePage />} />
          <Route path="/month" element={<MonthPage />} />
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
    </Routes></Suspense>
  )
}

export default App
