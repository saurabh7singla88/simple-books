import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { JournalEntry } from '../../types';
import { formatDate, STATUS_COLORS } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export default function JournalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journals'],
    queryFn: async () => (await apiClient.get('/api/journals')).data,
  });

  const post = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/journals/${id}/post`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
          <p className="text-gray-500 text-sm mt-1">{entries.length} entries</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/journals/new')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New Entry
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
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/journals/${e.id}`)}>{e.entryNumber}</td>
                  <td className="px-3 py-3 text-sm text-gray-500">{formatDate(e.date)}</td>
                  <td className="px-3 py-3 text-sm text-gray-900">{e.description}</td>
                  <td className="px-3 py-3 text-sm text-gray-400">{e.reference}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'DRAFT' && (
                          <>
                            <button onClick={() => navigate(`/journals/${e.id}`)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                            <button onClick={() => { if (window.confirm('Post this entry? It cannot be edited after posting.')) post.mutate(e.id); }} className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50">Post</button>
                          </>
                        )}
                        {e.status === 'POSTED' && (
                          <button onClick={() => navigate(`/journals/${e.id}`)} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">View</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">No journal entries yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
