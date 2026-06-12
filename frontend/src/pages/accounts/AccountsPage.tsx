import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { ChartAccount, AccountType } from '../../types';
import { useAuthStore } from '../../store/authStore';

const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const TYPE_COLORS: Record<AccountType, string> = {
  ASSET: 'bg-blue-100 text-blue-700',
  LIABILITY: 'bg-orange-100 text-orange-700',
  EQUITY: 'bg-purple-100 text-purple-700',
  REVENUE: 'bg-green-100 text-green-700',
  EXPENSE: 'bg-red-100 text-red-700',
};

interface ModalProps { account?: ChartAccount; onClose: () => void; }

function AccountModal({ account, onClose }: ModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: account?.code ?? '', name: account?.name ?? '', type: account?.type ?? 'ASSET' as AccountType, description: account?.description ?? '' });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (data: typeof form) => account
      ? apiClient.patch(`/api/accounts/${account.id}`, data)
      : apiClient.post('/api/accounts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); onClose(); },
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">{account ? 'Edit Account' : 'New Account'}</h3>
        <form onSubmit={e => { e.preventDefault(); setError(''); save.mutate(form); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 1001" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TYPE_ORDER.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Account name" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={save.isPending} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [modal, setModal] = useState<{ open: boolean; account?: ChartAccount }>({ open: false });
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const { data: accounts = [], isLoading } = useQuery<ChartAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/api/accounts')).data,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id }: { id: string; isActive: boolean }) => apiClient.delete(`/api/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const grouped = TYPE_ORDER.map(type => ({
    type,
    items: accounts.filter(a => a.type === type),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">{accounts.length} accounts</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal({ open: true })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New Account
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-16 text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ type, items }) => (
            <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_COLORS[type]}`}>{type}</span>
                <span className="text-xs text-gray-400">{items.length} accounts</span>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {items.map(acc => (
                    <tr key={acc.id} className={`hover:bg-gray-50 transition-colors ${!acc.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3 text-sm font-mono text-gray-500 w-24">{acc.code}</td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">{acc.name}</td>
                      <td className="px-3 py-3 text-sm text-gray-400 hidden md:table-cell">{acc.description}</td>
                      <td className="px-5 py-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setModal({ open: true, account: acc })} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                            <button onClick={() => toggleActive.mutate({ id: acc.id, isActive: !acc.isActive })} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">
                              {acc.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {modal.open && <AccountModal account={modal.account} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
