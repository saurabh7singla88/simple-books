import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { RecurringExpense } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly',
};

export default function RecurringExpensesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const today = new Date().toISOString().split('T')[0];
  const [generating, setGenerating] = useState<string | null>(null);
  const [genResult, setGenResult] = useState<{ billNumber: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery<RecurringExpense[]>({
    queryKey: ['recurring-expenses'],
    queryFn: async () => (await apiClient.get('/api/recurring-expenses')).data,
  });

  const toggle = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/recurring-expenses/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/recurring-expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  });

  const generate = async (id: string) => {
    setGenerating(id);
    setGenResult(null);
    try {
      const res = await apiClient.post(`/api/recurring-expenses/${id}/generate`);
      setGenResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    } finally {
      setGenerating(null);
    }
  };

  const dueSoon = rows.filter(r => r.isActive && r.nextDate <= today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recurring Expenses</h2>
          <p className="text-sm text-gray-500 mt-0.5">Templates that auto-generate bills on a schedule</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/recurring-expenses/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Recurring Expense
          </button>
        )}
      </div>

      {genResult && (
        <div className="mb-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          <span>Bill <strong>{genResult.billNumber}</strong> created successfully.</span>
          <button onClick={() => navigate('/bills')} className="text-green-700 underline text-xs">View Bills</button>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{dueSoon.length} recurring expense{dueSoon.length > 1 ? 's' : ''} due today or overdue</p>
          <p className="text-xs text-amber-600 mt-0.5">Click "Generate Bill" to create a bill from each one.</p>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm py-12 text-center">Loading…</p>}

      {!isLoading && rows.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🔄</p>
          <p className="font-medium text-gray-500 mb-1">No recurring expenses yet</p>
          <p className="text-sm">Create a template and generate bills automatically.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Account</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Frequency</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Next Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => {
                const isDue = r.isActive && r.nextDate <= today;
                const total = r.amount * (1 + r.taxRate / 100);
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.name}
                      {r.description && <p className="text-xs text-gray-400 font-normal">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.contactName ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{r.accountName ?? r.accountId}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{FREQ_LABEL[r.frequency]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={isDue ? 'font-semibold text-amber-600' : 'text-gray-600'}>{formatDate(r.nextDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {canEdit && r.isActive && (
                          <button
                            onClick={() => generate(r.id)}
                            disabled={generating === r.id}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${isDue ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'} disabled:opacity-50`}
                          >
                            {generating === r.id ? '…' : 'Generate Bill'}
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => navigate(`/recurring-expenses/${r.id}`)} className="px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">Edit</button>
                        )}
                        {canEdit && (
                          <button onClick={() => toggle.mutate(r.id)} className="px-2.5 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">
                            {r.isActive ? 'Pause' : 'Resume'}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => { if (confirm(`Delete "${r.name}"?`)) remove.mutate(r.id); }}
                            className="px-2.5 py-1 rounded text-xs border border-red-200 text-red-500 hover:bg-red-50"
                          >Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
