import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { Contact, LineItem, Invoice, ChartAccount } from '../../types';
import { formatCurrency, today, addDays } from '../../lib/utils';

const EMPTY_LINE: LineItem = { description: '', quantity: 1, rate: 0, taxRate: 0, accountId: null };

export default function InvoiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState({ contactId: '', date: today(), dueDate: addDays(today(), 30), notes: '' });
  const [lines, setLines] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState('');

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts', 'CUSTOMER'],
    queryFn: async () => (await apiClient.get('/api/contacts', { params: { type: 'CUSTOMER' } })).data,
  });

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/api/accounts')).data,
  });
  const revenueAccounts = accounts.filter(a => a.type === 'REVENUE' && a.isActive);

  const { data: existing } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: async () => (await apiClient.get(`/api/invoices/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({ contactId: existing.contactId, date: existing.date, dueDate: existing.dueDate, notes: existing.notes ?? '' });
      if (existing.lines?.length) setLines(existing.lines);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, lines: lines.map(l => ({ description: l.description, quantity: l.quantity, rate: l.rate, taxRate: l.taxRate, accountId: l.accountId ?? undefined })) };
      return isNew ? apiClient.post('/api/invoices', payload) : apiClient.patch(`/api/invoices/${id}`, payload);
    },
    onSuccess: () => navigate('/invoices'),
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'),
  });

  const updateLine = (i: number, field: keyof LineItem, value: string | number | null) => {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
  const taxTotal = lines.reduce((s, l) => s + l.quantity * l.rate * (l.taxRate / 100), 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isNew ? 'New Invoice' : `Edit ${existing?.invoiceNumber ?? ''}`}</h2>
        </div>
        <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
            <select value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select customer…</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
        </div>

        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Account</th>
                <th className="text-left py-2 font-medium text-gray-600">Description</th>
                <th className="text-right py-2 font-medium text-gray-600 w-16">Qty</th>
                <th className="text-right py-2 font-medium text-gray-600 w-24">Rate</th>
                <th className="text-right py-2 font-medium text-gray-600 w-16">Tax %</th>
                <th className="text-right py-2 font-medium text-gray-600 w-24">Amount</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-1 w-56">
                    <select value={l.accountId ?? ''} onChange={e => updateLine(i, 'accountId', e.target.value || null)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— account —</option>
                      {revenueAccounts.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-1">
                    <input value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Description" required />
                  </td>
                  <td className="py-1.5 px-1">
                    <input type="number" min="0.01" step="0.01" value={l.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1.5 px-1">
                    <input type="number" min="0" step="0.01" value={l.rate} onChange={e => updateLine(i, 'rate', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1.5 px-1">
                    <input type="number" min="0" max="100" step="0.5" value={l.taxRate} onChange={e => updateLine(i, 'taxRate', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="py-1.5 px-1 text-right text-gray-600 font-medium whitespace-nowrap">
                    {formatCurrency(l.quantity * l.rate)}
                  </td>
                  <td className="py-1.5 pl-1">
                    {lines.length > 1 && (
                      <button onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add line</button>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Tax</span><span>{formatCurrency(taxTotal)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>{formatCurrency(subtotal + taxTotal)}</span></div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={() => navigate('/invoices')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { setError(''); save.mutate(); }} disabled={save.isPending || !form.contactId} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
