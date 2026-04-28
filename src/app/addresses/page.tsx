'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { API } from '@/lib/api';

interface SavedAddress {
  id: number;
  label: string;
  address: string;
  phone: string | null;
  isDefault: boolean;
}

export default function AddressesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', address: '', phone: '', isDefault: false });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push('/'); return; }
    fetchData();
  }, [isLoggedIn, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch { toast(t('error'), 'error'); }
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.address.trim()) {
      toast(t('error'), 'error'); return;
    }
    try {
      const url = editId ? `${API}/addresses/${editId}` : `${API}/addresses`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast(editId ? t('addressUpdated') : t('addressAdded'), 'success');
        setForm({ label: '', address: '', phone: '', isDefault: false });
        setShowForm(false);
        setEditId(null);
        fetchData();
      } else toast(data.message, 'error');
    } catch { toast(t('error'), 'error'); }
  };

  const edit = (a: SavedAddress) => {
    setForm({ label: a.label, address: a.address, phone: a.phone || '', isDefault: a.isDefault });
    setEditId(a.id);
    setShowForm(true);
  };

  const remove = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await fetch(`${API}/addresses/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast(t('addressDeleted'), 'success');
    } catch { toast(t('error'), 'error'); }
  };

  const inputCls = 'w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500';

  if (authLoading || !isLoggedIn) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('myAddresses')}</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ label: '', address: '', phone: '', isDefault: false }); }}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-medium">
          {showForm ? t('cancel') : `+ ${t('addAddress')}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-card border border-card-border rounded-2xl p-4 mb-6 space-y-3">
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder={t('addressLabel')} className={inputCls} required />
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t('address')} className={inputCls} required />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('phone')} className={inputCls} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
            {t('setAsDefault')}
          </label>
          <button type="submit" className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-sm font-medium">
            {editId ? t('save') : t('add')}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p>{t('noAddresses')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(a => (
            <div key={a.id} className="bg-card border border-card-border rounded-2xl p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.label}</span>
                  {a.isDefault && <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full">{t('default')}</span>}
                </div>
                <p className="text-sm text-muted mt-1">{a.address}</p>
                {a.phone && <p className="text-xs text-muted mt-1">{a.phone}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => edit(a)} className="text-xs text-orange-500 hover:text-orange-400">{t('edit')}</button>
                <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:text-red-400">{t('delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
