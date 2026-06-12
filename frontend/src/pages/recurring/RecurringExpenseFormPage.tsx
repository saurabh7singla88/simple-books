import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Contact, ChartAccount, RecurringExpense, RecurringFrequency } from '../../types';
import { today } from '../../lib/utils';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly',
};

export default function RecurringExpenseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState({
    name: '',
    contactId: '',
    accountId: '',
    description: '',
    amount: 0,
    taxRate: 0,
    frequency: 'MONTHLY' as RecurringFrequency,
    startDate: today(),
    endDate: '',
    nextDate: today(),
    notes: '',
  });
  const [error, setError] = useState('');

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => (await apiClient.get('/api/contacts', { params: { type: 'VENDOR' } })).data,
  });

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/api/accounts')).data,
  });
  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE' && a.isActive);

  const { data: existing } = useQuery<RecurringExpense>({
    queryKey: ['recurring-expense', id],
    queryFn: async () => (await apiClient.get(`/api/recurring-expenses/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        contactId: existing.contactId ?? '',
        accountId: existing.accountId,
        description: existing.description,
        amount: existing.amount,
        taxRate: existing.taxRate,
        frequency: existing.frequency,
        startDate: existing.startDate,
        endDate: existing.endDate ?? '',
        nextDate: existing.nextDate,
        notes: existing.notes ?? '',
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        contactId: form.contactId || undefined,
        endDate: form.endDate || undefined,
        notes: form.notes || undefined,
      };
      return isNew
        ? apiClient.post('/api/recurring-expenses', payload)
        : apiClient.patch(`/api/recurring-expenses/${id}`, payload);
    },
    onSuccess: () => navigate('/recurring-expenses'),
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'),
  });

  const total = form.amount * (1 + form.taxRate / 100);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{isNew ? 'New Recurring Expense' : 'Edit Recurring Expense'}</h2>
        <button onClick={() => navigate('/recurring-expenses')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Monthly Office Rent"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Vendor + Account */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
            <select value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— None —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expense Account *</label>
            <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select account…</option>
              {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Line item description on generated bill"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Amount + Tax */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number" min="0" step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tax %</label>
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.taxRate}
              onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {form.amount > 0 && form.taxRate > 0 && (
          <p className="text-xs text-gray-400 -mt-3">Total per bill: <strong className="text-gray-700">₹{total.toFixed(2)}</strong></p>
        )}

        {/* Frequency */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Frequency *</label>
          <div className="flex gap-2">
            {FREQUENCIES.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setForm(fm => ({ ...fm, frequency: f }))}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${form.frequency === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'}`}
              >{FREQ_LABEL[f]}</button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value, nextDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Next Bill Date *</label>
            <input type="date" value={form.nextDate} onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={() => navigate('/recurring-expenses')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { setError(''); save.mutate(); }}
            disabled={save.isPending || !form.name || !form.accountId || !form.description || !form.startDate}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
