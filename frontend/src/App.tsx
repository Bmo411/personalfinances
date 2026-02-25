import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/dashboard/Dashboard'

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
        <Route path="/history" element={<History />} />
        <Route path="/categories" element={<Categories />} />
      </Route>
    </Routes>
  )
}

export default App
