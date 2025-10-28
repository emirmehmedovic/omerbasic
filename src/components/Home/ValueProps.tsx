export function ValueProps() {
  const items = [
    { title: "Brza dostava", desc: "Isporuka u 24h širom BiH" },
    { title: "Provjerena kvaliteta", desc: "Provjereni brendovi i garancija" },
    { title: "Stručna podrška", desc: "Savjet i pomoć pri odabiru" },
    { title: "B2B pogodnosti", desc: "Posebni uslovi za partnere" },
  ];
  return (
    <section className="mb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.title} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="text-slate-900 font-semibold mb-1">{it.title}</div>
            <div className="text-slate-600 text-sm">{it.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
