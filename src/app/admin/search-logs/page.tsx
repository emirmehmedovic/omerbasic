import { db } from "@/lib/db";
import { StatCard } from "@/components/admin/StatCard";
import { Activity, Search, Ban, ListChecks } from "lucide-react";

export const revalidate = 60;

const DAYS = 30;

function formatNumber(value: number) {
  return new Intl.NumberFormat("bs-BA").format(value);
}

export default async function SearchLogsPage() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const [totalSearches, uniqueQueryGroups, noResultsCount, topQueries, topNoResults] =
    await Promise.all([
      db.searchLog.count({
        where: {
          createdAt: { gte: since },
        },
      }),
      db.searchLog.groupBy({
        by: ["query"],
        where: {
          createdAt: { gte: since },
          query: { not: null },
        },
      }),
      db.searchLog.count({
        where: {
          createdAt: { gte: since },
          resultsCount: 0,
        },
      }),
      db.searchLog.groupBy({
        by: ["query"],
        where: {
          createdAt: { gte: since },
          query: { not: null },
        },
        _count: { query: true },
        _avg: { resultsCount: true },
        orderBy: { _count: { query: "desc" } },
        take: 30,
      }),
      db.searchLog.groupBy({
        by: ["query"],
        where: {
          createdAt: { gte: since },
          query: { not: null },
          resultsCount: 0,
        },
        _count: { query: true },
        orderBy: { _count: { query: "desc" } },
        take: 20,
      }),
    ]);

  const uniqueSearches = uniqueQueryGroups.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analitika pretrage</h1>
        <p className="text-sm text-gray-600 mt-2">
          Pregled za posljednjih {DAYS} dana.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ukupno pretraga"
          value={formatNumber(totalSearches)}
          icon={Activity}
          description="Sve pretrage iz kataloga i SEO landing stranica."
        />
        <StatCard
          title="Unikatni upiti"
          value={formatNumber(uniqueSearches)}
          icon={Search}
          description="Različiti upiti korisnika."
        />
        <StatCard
          title="Bez rezultata"
          value={formatNumber(noResultsCount)}
          icon={Ban}
          description="Upiti koji nisu vratili proizvode."
        />
        <StatCard
          title="Najčešći upiti"
          value={formatNumber(topQueries.length)}
          icon={ListChecks}
          description="Top upiti u zadnjih 30 dana."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber/20 bg-white/90 shadow-sm">
          <div className="border-b border-amber/20 px-6 py-4 bg-gradient-to-r from-amber/5 to-orange/5 rounded-t-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Top pretrage</h2>
          </div>
          <div className="p-6">
            {topQueries.length === 0 ? (
              <p className="text-sm text-gray-600">Nema podataka za prikaz.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-3 pr-4 font-medium">Upit</th>
                      <th className="pb-3 pr-4 font-medium">Pretrage</th>
                      <th className="pb-3 font-medium">Prosj. rezultata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topQueries.map((row) => (
                      <tr key={row.query ?? "n/a"} className="border-t border-gray-100">
                        <td className="py-3 pr-4 font-semibold text-gray-800">
                          {row.query ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {formatNumber(row._count.query)}
                        </td>
                        <td className="py-3 text-gray-700">
                          {row._avg.resultsCount === null
                            ? "—"
                            : formatNumber(Math.round(row._avg.resultsCount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-white/90 shadow-sm">
          <div className="border-b border-rose-200 px-6 py-4 bg-gradient-to-r from-rose-50 to-amber-50 rounded-t-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Upiti bez rezultata</h2>
          </div>
          <div className="p-6">
            {topNoResults.length === 0 ? (
              <p className="text-sm text-gray-600">Nema upita bez rezultata.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-3 pr-4 font-medium">Upit</th>
                      <th className="pb-3 font-medium">Broj puta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topNoResults.map((row) => (
                      <tr key={row.query ?? "n/a"} className="border-t border-gray-100">
                        <td className="py-3 pr-4 font-semibold text-gray-800">
                          {row.query ?? "—"}
                        </td>
                        <td className="py-3 text-gray-700">
                          {formatNumber(row._count.query)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
