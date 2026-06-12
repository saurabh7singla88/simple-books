import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { Bill } from '../../types';
import { formatCurrency, formatDate, STATUS_COLORS } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export default function BillsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: async () => (await apiClient.get('/api/bills')).data,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/bills/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
          <p className="text-gray-500 text-sm mt-1">{bills.length} bills</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/bills/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New Bill
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
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.map(bill => (
                <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/bills/${bill.id}`)}>{bill.billNumber}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{bill.contactName}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{formatDate(bill.date)}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{formatDate(bill.dueDate)}</td>
                  <td className="px-3 py-3">
                    {canEdit ? (
                      <select value={bill.status} onChange={e => updateStatus.mutate({ id: bill.id, status: e.target.value })} className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[bill.status]}`}>
                        {['DRAFT','RECEIVED','PAID','VOID'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[bill.status]}`}>{bill.status}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(bill.total)}</td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && <button onClick={() => navigate(`/bills/${bill.id}`)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Edit</button>}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">No bills yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
