import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { formatCurrency } from '../../lib/utils';

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toISOString().split('T')[0]; }

interface PLRow { id: string; code: string; name: string; net: number; }
interface PLData { from: string; to: string; revenue: PLRow[]; totalRevenue: number; expenses: PLRow[]; totalExpenses: number; netIncome: number; }
interface BSRow { id: string; code: string; name: string; balance: number; }
interface BSData { asOf: string; assets: BSRow[]; totalAssets: number; liabilities: BSRow[]; totalLiabilities: number; equity: BSRow[]; totalEquity: number; }

export default function ReportsPage() {
  const [tab, setTab] = useState<'pl' | 'bs'>('pl');

  // Draft (input) state — doesn't trigger queries
  const [plFrom, setPlFrom] = useState(firstDayOfMonth());
  const [plTo, setPlTo] = useState(today());
  const [bsAsOf, setBsAsOf] = useState(today());

  // Applied state — only updates when user clicks Run
  const [appliedPl, setAppliedPl] = useState({ from: firstDayOfMonth(), to: today() });
  const [appliedBsAsOf, setAppliedBsAsOf] = useState(today());

  const pl = useQuery<PLData>({
    queryKey: ['report-pl', appliedPl.from, appliedPl.to],
    queryFn: async () => (await apiClient.get('/api/reports/profit-loss', { params: { from: appliedPl.from, to: appliedPl.to } })).data,
    enabled: tab === 'pl',
  });

  const bs = useQuery<BSData>({
    queryKey: ['report-bs', appliedBsAsOf],
    queryFn: async () => (await apiClient.get('/api/reports/balance-sheet', { params: { asOf: appliedBsAsOf } })).data,
    enabled: tab === 'bs',
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('pl')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pl' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
          Profit & Loss
        </button>
        <button onClick={() => setTab('bs')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'bs' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
          Balance Sheet
        </button>
      </div>

      {tab === 'pl' && (
        <div>
          <div className="flex gap-3 items-end mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={plFrom} onChange={e => setPlFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={plTo} onChange={e => setPlTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => setAppliedPl({ from: plFrom, to: plTo })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Run Report
            </button>
            {pl.isFetching && <span className="text-xs text-gray-400 self-center">Loading…</span>}
          </div>

          {pl.isLoading && !pl.data && <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>}
          {pl.data && (
            <div className="space-y-4">
              <Section title="Revenue" rows={pl.data.revenue} total={pl.data.totalRevenue} totalLabel="Total Revenue" totalColor="text-green-700" />
              <Section title="Expenses" rows={pl.data.expenses} total={pl.data.totalExpenses} totalLabel="Total Expenses" totalColor="text-red-700" />
              <div className="bg-white rounded-xl border-2 border-gray-900 p-5 flex justify-between items-center">
                <span className="font-bold text-gray-900">Net Income</span>
                <span className={`text-xl font-bold ${pl.data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(pl.data.netIncome)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'bs' && (
        <div>
          <div className="flex gap-3 items-end mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">As of</label>
              <input type="date" value={bsAsOf} onChange={e => setBsAsOf(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => setAppliedBsAsOf(bsAsOf)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Run Report
            </button>
            {bs.isFetching && <span className="text-xs text-gray-400 self-center">Loading…</span>}
          </div>

          {bs.isLoading && !bs.data && <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>}
          {bs.data && (
            <div className="space-y-4">
              <Section title="Assets" rows={bs.data.assets} total={bs.data.totalAssets} totalLabel="Total Assets" totalColor="text-blue-700" />
              <Section title="Liabilities" rows={bs.data.liabilities} total={bs.data.totalLiabilities} totalLabel="Total Liabilities" totalColor="text-orange-700" />
              <Section title="Equity" rows={bs.data.equity} total={bs.data.totalEquity} totalLabel="Total Equity" totalColor="text-purple-700" />
              <div className="bg-white rounded-xl border-2 border-gray-900 p-5 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Liabilities + Equity</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(bs.data.totalLiabilities + bs.data.totalEquity)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, rows, total, totalLabel, totalColor }: { title: string; rows: Array<{ code: string; name: string; net?: number; balance?: number }>; total: number; totalLabel: string; totalColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-5 py-2.5 text-sm text-gray-500 font-mono w-24">{r.code}</td>
              <td className="px-3 py-2.5 text-sm text-gray-800">{r.name}</td>
              <td className="px-5 py-2.5 text-sm text-right font-medium text-gray-700">{formatCurrency(r.net ?? r.balance ?? 0)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={3} className="px-5 py-4 text-center text-gray-400 text-sm">No transactions in this period</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={2} className={`px-5 py-3 text-sm font-semibold ${totalColor}`}>{totalLabel}</td>
            <td className={`px-5 py-3 text-sm font-bold text-right ${totalColor}`}>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
