export function SocialProof() {
  const items = [
    { label: "Ocjena", value: "4.9/5", note: "1200+ recenzija" },
    { label: "Godina iskustva", value: "15+", note: "u industriji" },
    { label: "Kupaca", value: "1,200+", note: "aktivnih" },
    { label: "Isporuka", value: "24h", note: "široka mreža" },
  ];
  return (
    <section className="mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-2xl bg-white border border-slate-200 p-5 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{it.value}</div>
            <div className="text-slate-700 text-sm">{it.label}</div>
            <div className="text-slate-500 text-xs mt-1">{it.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
