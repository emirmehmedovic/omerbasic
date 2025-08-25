'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i),
  isActive: z.boolean(),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  mediaUrl: z.string().url(),
});

export default function EditAdsScreenPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', isActive: true, mediaType: 'IMAGE', mediaUrl: '' });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/ads-screens/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
      setForm({
        name: json.name,
        slug: json.slug,
        isActive: json.isActive,
        mediaType: json.mediaType,
        mediaUrl: json.mediaUrl,
      });
    } catch (e: any) {
      setLoadError(e.message || 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    const parsed = updateSchema.safeParse(form);
    if (!parsed.success) {
      setErrMsg('Provjerite unesena polja.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ads-screens/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      if (!res.ok) throw new Error(await res.text());
      router.push('/admin/ads-screens');
    } catch (e: any) {
      setErrMsg(e.message || 'Greška pri spremanju');
    } finally {
      setSaving(false);
    }
  };

  if (!id) return <div>Nepostojeći ID</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Uredi ekran</h1>
        <p className="text-sm text-gray-600">Ažurirajte naziv, slug i medij.</p>
      </div>

      {loading ? (
        <div>Učitavanje...</div>
      ) : loadError ? (
        <div className="text-red-600">Greška pri učitavanju</div>
      ) : (
        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border rounded-xl bg-white shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naziv</label>
            <input className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 caret-amber focus:ring-2 focus:ring-amber/50 focus:border-amber outline-none" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 caret-amber focus:ring-2 focus:ring-amber/50 focus:border-amber outline-none" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tip medija</label>
            <select className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-amber/50 focus:border-amber outline-none" value={form.mediaType} onChange={e=>setForm(f=>({...f,mediaType:e.target.value}))}>
              <option value="IMAGE">Slika</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Media URL</label>
            <input className="w-full border rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 caret-amber focus:ring-2 focus:ring-amber/50 focus:border-amber outline-none" value={form.mediaUrl} onChange={e=>setForm(f=>({...f,mediaUrl:e.target.value}))} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <input id="active" type="checkbox" className="h-4 w-4 text-amber focus:ring-amber border-gray-300 rounded" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} />
            <label htmlFor="active" className="text-sm text-gray-700">Aktivan</label>
          </div>
          <div className="md:col-span-2">
            <button disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber via-orange to-brown text-white px-5 py-2.5 rounded-lg shadow hover:opacity-95 disabled:opacity-60 transition">{saving?'Spremanje...':'Spremi'}</button>
            {errMsg && <span className="text-red-600 ml-3 text-sm">{errMsg}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
