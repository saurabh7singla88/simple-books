import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Role } from './types';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import AccountsPage from './pages/accounts/AccountsPage';
import ContactsPage from './pages/contacts/ContactsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import BillsPage from './pages/bills/BillsPage';
import BillFormPage from './pages/bills/BillFormPage';
import JournalsPage from './pages/journals/JournalsPage';
import JournalFormPage from './pages/journals/JournalFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import RecurringExpensesPage from './pages/recurring/RecurringExpensesPage';
import RecurringExpenseFormPage from './pages/recurring/RecurringExpenseFormPage';

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: Role }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage />} />
        <Route path="invoices/:id" element={<InvoiceFormPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="bills/new" element={<BillFormPage />} />
        <Route path="bills/:id" element={<BillFormPage />} />
        <Route path="journals" element={<JournalsPage />} />
        <Route path="journals/new" element={<JournalFormPage />} />
        <Route path="journals/:id" element={<JournalFormPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="recurring-expenses" element={<RecurringExpensesPage />} />
        <Route path="recurring-expenses/new" element={<RecurringExpenseFormPage />} />
        <Route path="recurring-expenses/:id" element={<RecurringExpenseFormPage />} />
        <Route path="users" element={<PrivateRoute requiredRole="ADMIN"><UsersPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

