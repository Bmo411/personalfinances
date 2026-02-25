import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/dashboard/Dashboard'
import { PreferencesPage } from './pages/preferences/PreferencesPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { SavingsPage } from './pages/savings/SavingsPage';
import { DebtsPage } from './pages/debts/DebtsPage';
import { RecurringPage } from './pages/recurring/RecurringPage';

// Placeholders for views
const History = () => <div className="p-6">Historial</div>;
const Categories = () => <div className="p-6">Categorías</div>;

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/history" element={<History />} />
        <Route path="/categories" element={<Categories />} />
      </Route>
    </Routes>
  )
}

export default App
