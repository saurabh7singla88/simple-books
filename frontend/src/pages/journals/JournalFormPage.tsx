import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { ChartAccount, JournalEntry, JournalLine } from '../../types';
import { formatCurrency, today } from '../../lib/utils';

const EMPTY_LINE: JournalLine = { accountId: '', description: '', debit: 0, credit: 0 };

export default function JournalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState({ date: today(), description: '', reference: '' });
  const [lines, setLines] = useState<JournalLine[]>([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
  const [error, setError] = useState('');

  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await apiClient.get('/api/accounts')).data,
  });

  const { data: existing } = useQuery<JournalEntry>({
    queryKey: ['journal', id],
    queryFn: async () => (await apiClient.get(`/api/journals/${id}`)).data,
    enabled: !!id,
  });

  useEffect(() => {
    if (existing) {
      setForm({ date: existing.date, description: existing.description, reference: existing.reference ?? '' });
      if (existing.lines?.length) setLines(existing.lines);
    }
  }, [existing]);

  const isPosted = existing?.status === 'POSTED';

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, lines: lines.map(l => ({ accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit })) };
      return isNew ? apiClient.post('/api/journals', payload) : apiClient.patch(`/api/journals/${id}`, payload);
    },
    onSuccess: () => navigate('/journals'),
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'),
  });

  const updateLine = (i: number, field: keyof JournalLine, value: string | number) => {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const activeAccounts = accounts.filter(a => a.isActive);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isNew ? 'New Journal Entry' : isPosted ? existing?.entryNumber : `Edit ${existing?.entryNumber ?? ''}`}
        </h2>
        <button onClick={() => navigate('/journals')} className="text-sm text-gray-500 hover:text-gray-900">← Back</button>
      </div>

      {isPosted && (
        <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          This entry is posted and cannot be edited.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} disabled={isPosted} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} disabled={isPosted} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} disabled={isPosted} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" placeholder="INV-0001, BILL-0001…" />
          </div>
        </div>

        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Account</th>
                <th className="text-left py-2 font-medium text-gray-600">Description</th>
                <th className="text-right py-2 font-medium text-gray-600 w-32">Debit</th>
                <th className="text-right py-2 font-medium text-gray-600 w-32">Credit</th>
                {!isPosted && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2 w-56">
                    {isPosted ? (
                      <span className="text-gray-700">{l.accountCode} — {l.accountName}</span>
                    ) : (
                      <select value={l.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">Select account…</option>
                        {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="py-1.5 px-1">
                    {isPosted ? (
                      <span className="text-gray-500">{l.description}</span>
                    ) : (
                      <input value={l.description ?? ''} onChange={e => updateLine(i, 'description', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Optional" />
                    )}
                  </td>
                  <td className="py-1.5 px-1">
                    {isPosted ? (
                      <span className="block text-right">{l.debit ? formatCurrency(l.debit) : ''}</span>
                    ) : (
                      <input type="number" min="0" step="0.01" value={l.debit} onChange={e => { updateLine(i, 'debit', parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) updateLine(i, 'credit', 0); }} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    )}
                  </td>
                  <td className="py-1.5 px-1">
                    {isPosted ? (
                      <span className="block text-right">{l.credit ? formatCurrency(l.credit) : ''}</span>
                    ) : (
                      <input type="number" min="0" step="0.01" value={l.credit} onChange={e => { updateLine(i, 'credit', parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) > 0) updateLine(i, 'debit', 0); }} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    )}
                  </td>
                  {!isPosted && (
                    <td className="py-1.5 pl-1">
                      {lines.length > 2 && <button onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>}
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td colSpan={2} className="px-2 py-2 text-sm text-gray-600">Totals</td>
                <td className={`px-2 py-2 text-sm text-right ${balanced ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(totalDebit)}</td>
                <td className={`px-2 py-2 text-sm text-right ${balanced ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(totalCredit)}</td>
                {!isPosted && <td></td>}
              </tr>
            </tbody>
          </table>
          {!isPosted && (
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])} className="text-sm text-blue-600 hover:text-blue-800">+ Add line</button>
              {!balanced && totalDebit > 0 && (
                <p className="text-xs text-red-600">Debits and credits must be equal</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {!isPosted && (
          <div className="flex gap-3 pt-1">
            <button onClick={() => navigate('/journals')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => { setError(''); save.mutate(); }} disabled={save.isPending || !balanced || totalDebit === 0} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
