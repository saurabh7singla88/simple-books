import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';
import { formatCurrency } from '../lib/utils';

interface Summary { receivable: number; payable: number; customers: number; vendors: number; }

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: summary } = useQuery<Summary>({
    queryKey: ['report-summary'],
    queryFn: async () => (await apiClient.get('/api/reports/summary')).data,
  });

  const cards = [
    { label: 'Receivable', value: formatCurrency(summary?.receivable ?? 0), sub: 'Unpaid invoices', color: 'text-blue-600', path: '/invoices' },
    { label: 'Payable', value: formatCurrency(summary?.payable ?? 0), sub: 'Unpaid bills', color: 'text-orange-600', path: '/bills' },
    { label: 'Customers', value: String(summary?.customers ?? 0), sub: 'Active customers', color: 'text-green-600', path: '/contacts?type=CUSTOMER' },
    { label: 'Vendors', value: String(summary?.vendors ?? 0), sub: 'Active vendors', color: 'text-purple-600', path: '/contacts?type=VENDOR' },
  ];

  const modules = [
    { label: 'Chart of Accounts', path: '/accounts', icon: '📋' },
    { label: 'Journal Entries', path: '/journals', icon: '📓' },
    { label: 'Invoices', path: '/invoices', icon: '🧾' },
    { label: 'Bills', path: '/bills', icon: '📑' },
    { label: 'Customers', path: '/contacts?type=CUSTOMER', icon: '🏢' },
    { label: 'Vendors', path: '/contacts?type=VENDOR', icon: '🏭' },
    { label: 'P&L Report', path: '/reports', icon: '📊' },
    { label: 'Balance Sheet', path: '/reports', icon: '⚖️' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} onClick={() => navigate(card.path)} className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map(m => (
            <button key={m.label} onClick={() => navigate(m.path)} className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors text-center">
              <span className="text-2xl">{m.icon}</span>
              <span className="text-xs text-gray-600 font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

