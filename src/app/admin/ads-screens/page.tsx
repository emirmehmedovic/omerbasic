'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';

const screenSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i),
  isActive: z.boolean().default(true),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  mediaUrl: z.string().url(),
});

export default function AdsScreensPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', isActive: true, mediaType: 'IMAGE', mediaUrl: '' });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/ads-screens');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setLoadError(e.message || 'Greška pri učitavanju');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    const parsed = screenSchema.safeParse(form);
    if (!parsed.success) {
      setErrMsg('Provjerite unesena polja.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ads-screens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Greška pri spremanju');
      }
      setForm({ name: '', slug: '', isActive: true, mediaType: 'IMAGE', mediaUrl: '' });
      await load();
    } catch (e: any) {
      setErrMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Obrisati ekran?')) return;
    await fetch(`/api/ads-screens/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reklamni ekrani</h1>
          <p className="text-sm text-gray-600">Kreirajte ekrane (ruta: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">/ads/[slug]</code>) i postavite sliku ili video URL.</p>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border rounded-xl bg-white shadow-sm">
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
        <div className="flex items-center gap-2 pt-2">
          <input id="active" type="checkbox" className="h-4 w-4 text-amber focus:ring-amber border-gray-300 rounded" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} />
          <label htmlFor="active" className="text-sm text-gray-700">Aktivan</label>
        </div>
        <div className="md:col-span-2">
          <button disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber via-orange to-brown text-white px-5 py-2.5 rounded-lg shadow hover:opacity-95 disabled:opacity-60 transition">
            {saving ? 'Spremanje...' : 'Dodaj ekran'}
          </button>
          {errMsg && <span className="text-red-600 ml-3 text-sm align-middle">{errMsg}</span>}
        </div>
      </form>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-sm text-gray-700">
            <tr>
              <th className="text-left p-3">Naziv</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Tip</th>
              <th className="text-left p-3">Pregled</th>
              <th className="text-left p-3">Aktivan</th>
              <th className="text-left p-3">Akcije</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800">
            {loading && (
              <tr><td colSpan={5} className="p-4">Učitavanje...</td></tr>
            )}
            {loadError && (
              <tr><td colSpan={5} className="p-4 text-red-600">Greška pri učitavanju</td></tr>
            )}
            {Array.isArray(data) && data.length === 0 && !loading && !loadError && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">Još nema ekrana. Dodajte prvi iznad.</td>
              </tr>
            )}
            {Array.isArray(data) && data.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-gray-50/60">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">{s.slug}</span></td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${s.mediaType === 'IMAGE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{s.mediaType}</span>
                </td>
                <td className="p-3">
                  {s.mediaType === 'IMAGE' ? (
                    <img src={s.mediaUrl} alt={s.name} className="w-20 h-12 object-cover rounded border" />
                  ) : (
                    <video src={s.mediaUrl} className="w-20 h-12 object-cover rounded border" muted />
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{s.isActive ? 'Da' : 'Ne'}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <a className="text-blue-600 hover:text-blue-700 underline" href={`/admin/ads-screens/${s.id}`}>Uredi</a>
                    <button className="text-red-600 hover:text-red-700" onClick={()=>onDelete(s.id)}>Obriši</button>
                    <a className="text-gray-700 hover:text-gray-900 underline" href={`/ads/${s.slug}`} target="_blank">Otvori</a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
