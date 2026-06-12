import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Invoice } from '../../types';
import { formatCurrency, formatDate, STATUS_COLORS } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => (await apiClient.get('/api/invoices')).data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/invoices/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <p className="text-gray-500 text-sm mt-1">{invoices.length} invoices</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/invoices/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New Invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center text-gray-400 py-16 text-sm">Loading…</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoiceNumber}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{inv.contactName}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{formatDate(inv.date)}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-3 py-3">
                    {canEdit ? (
                      <select
                        value={inv.status}
                        onChange={e => updateStatus.mutate({ id: inv.id, status: e.target.value })}
                        className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[inv.status]}`}
                      >
                        {['DRAFT','SENT','PAID','VOID'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <button onClick={() => navigate(`/invoices/${inv.id}`)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">No invoices yet. Create your first one.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
