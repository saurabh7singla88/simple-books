import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { Contact, ContactType } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface ModalProps { contact?: Contact; defaultType?: ContactType; onClose: () => void; }

function ContactModal({ contact, defaultType = 'CUSTOMER', onClose }: ModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: contact?.type ?? defaultType,
    name: contact?.name ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '',
    address: contact?.address ?? '', gstin: contact?.gstin ?? '', pan: contact?.pan ?? '', notes: contact?.notes ?? '',
  });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (data: typeof form) => contact
      ? apiClient.patch(`/api/contacts/${contact.id}`, data)
      : apiClient.post('/api/contacts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); onClose(); },
    onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'),
  });

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
        <h3 className="text-lg font-semibold mb-4">{contact ? 'Edit Contact' : 'New Contact'}</h3>
        <form onSubmit={e => { e.preventDefault(); setError(''); save.mutate(form); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={f('type')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={f('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={f('email')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={f('phone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
              <input value={form.gstin} onChange={f('gstin')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PAN</label>
              <input value={form.pan} onChange={f('pan')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={f('address')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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

const TYPE_BADGE: Record<ContactType, string> = {
  CUSTOMER: 'bg-blue-100 text-blue-700',
  VENDOR: 'bg-orange-100 text-orange-700',
  BOTH: 'bg-purple-100 text-purple-700',
};

export default function ContactsPage() {
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type') as ContactType | null;
  const [modal, setModal] = useState<{ open: boolean; contact?: Contact }>({ open: false });
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts', typeFilter],
    queryFn: async () => (await apiClient.get('/api/contacts', { params: typeFilter ? { type: typeFilter } : {} })).data,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const title = typeFilter === 'CUSTOMER' ? 'Customers' : typeFilter === 'VENDOR' ? 'Vendors' : 'All Contacts';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contacts</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal({ open: true })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New Contact
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Email</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Phone</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">GSTIN</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[c.type]}`}>{c.type}</span></td>
                  <td className="px-3 py-3 text-sm text-gray-500 hidden md:table-cell">{c.email}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 hidden lg:table-cell">{c.phone}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{c.gstin}</td>
                  <td className="px-5 py-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModal({ open: true, contact: c })} className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                        <button onClick={() => { if (window.confirm(`Remove ${c.name}?`)) deactivate.mutate(c.id); }} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Remove</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">No contacts yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <ContactModal
          contact={modal.contact}
          defaultType={typeFilter ?? 'CUSTOMER'}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
