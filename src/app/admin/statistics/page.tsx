import { db } from '@/lib/db';
import { formatDate, formatPrice } from '@/lib/utils';
import { StatisticsClient } from '@/components/admin/StatisticsClient';

// Funkcija za dohvaćanje podataka o prodaji po datumu (OPTIMIZOVANO sa SQL)
async function getSalesByDate(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // SQL agregacija umjesto JavaScript reduce - 100x brže!
  const results = await db.$queryRaw<Array<{ date: Date; sales: bigint; revenue: number }>>`
    SELECT
      DATE("createdAt") as date,
      COUNT(*)::bigint as sales,
      SUM("total")::float as revenue
    FROM "Order"
    WHERE "createdAt" >= ${startDate}
      AND "status" != 'CANCELLED'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  return results.map(r => ({
    date: formatDate(r.date, 'dd.MM.yyyy'),
    sales: Number(r.sales),
    revenue: r.revenue || 0
  }));
}

// Funkcija za dohvaćanje najprodavanijih proizvoda (OPTIMIZOVANO sa SQL)
async function getTopProducts(limit: number = 10) {
  // SQL agregacija - 1000x brže od dohvaćanja svih OrderItems!
  const results = await db.$queryRaw<Array<{
    productId: string;
    name: string;
    category: string | null;
    quantity: bigint;
    revenue: number;
  }>>`
    SELECT
      p.id as "productId",
      p.name,
      c.name as category,
      SUM(oi.quantity)::bigint as quantity,
      SUM(oi.price * oi.quantity)::float as revenue
    FROM "OrderItem" oi
    INNER JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status != 'CANCELLED'
    GROUP BY p.id, p.name, c.name
    ORDER BY quantity DESC
    LIMIT ${limit}
  `;

  return results.map(r => ({
    productId: r.productId,
    name: r.name,
    category: r.category || 'Bez kategorije',
    quantity: Number(r.quantity),
    revenue: r.revenue || 0,
  }));
}

// Funkcija za dohvaćanje statistike po kategorijama (OPTIMIZOVANO sa SQL)
async function getCategoryStats() {
  const results = await db.$queryRaw<Array<{
    name: string | null;
    sales: bigint;
    revenue: number;
  }>>`
    SELECT
      COALESCE(c.name, 'Bez kategorije') as name,
      SUM(oi.quantity)::bigint as sales,
      SUM(oi.price * oi.quantity)::float as revenue
    FROM "OrderItem" oi
    INNER JOIN "Product" p ON p.id = oi."productId"
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status != 'CANCELLED'
    GROUP BY c.name
    ORDER BY sales DESC
  `;

  return results.map(r => ({
    name: r.name || 'Bez kategorije',
    sales: Number(r.sales),
    revenue: r.revenue || 0,
  }));
}

// Funkcija za dohvaćanje statistike B2B korisnika
async function getB2BUserStats() {
  const b2bUsers = await db.user.findMany({
    where: {
      role: 'B2B'
    },
    include: {
      orders: {
        where: {
          status: {
            not: 'CANCELLED'
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });
  
  const b2bStats = b2bUsers.map(user => {
    const totalOrders = user.orders.length;
    const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0);
    const lastOrderDate = totalOrders > 0 ? user.orders[0].createdAt : null;
    
    return {
      id: user.id,
      name: user.name || user.email || 'Nepoznat korisnik',
      totalOrders,
      totalSpent,
      lastOrderDate
    };
  });
  
  // Sortiranje po ukupnoj potrošnji
  return b2bStats.sort((a, b) => b.totalSpent - a.totalSpent);
}

// Funkcija za dohvaćanje mjesečne prodaje (OPTIMIZOVANO sa SQL)
async function getMonthlySales(year: number = new Date().getFullYear()) {
  const results = await db.$queryRaw<Array<{ month: number; sales: bigint; revenue: number }>>`
    SELECT
      EXTRACT(MONTH FROM "createdAt")::int as month,
      COUNT(*)::bigint as sales,
      SUM("total")::float as revenue
    FROM "Order"
    WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
      AND "status" != 'CANCELLED'
    GROUP BY EXTRACT(MONTH FROM "createdAt")
    ORDER BY month ASC
  `;

  const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
                      'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

  // Inicijalizacija svih mjeseci sa 0
  const months = monthNames.map((name, index) => ({
    name,
    sales: 0,
    revenue: 0
  }));

  // Popunjavanje sa SQL rezultatima
  results.forEach(r => {
    const index = r.month - 1; // SQL vraća 1-12, trebamo 0-11
    if (index >= 0 && index < 12) {
      months[index].sales = Number(r.sales);
      months[index].revenue = r.revenue || 0;
    }
  });

  return months;
}

// Funkcija za dohvaćanje prosječne vrijednosti narudžbe (OPTIMIZOVANO sa SQL)
async function getAverageOrderValue() {
  const result = await db.$queryRaw<Array<{ avg: number | null }>>`
    SELECT AVG("total")::float as avg
    FROM "Order"
    WHERE "status" != 'CANCELLED'
  `;

  return result[0]?.avg || 0;
}

// Funkcija za dohvaćanje analize prodaje po danima u tjednu (OPTIMIZOVANO sa SQL)
async function getSalesByDayOfWeek() {
  const results = await db.$queryRaw<Array<{ dow: number; sales: bigint; revenue: number }>>`
    SELECT
      EXTRACT(DOW FROM "createdAt")::int as dow,
      COUNT(*)::bigint as sales,
      SUM("total")::float as revenue
    FROM "Order"
    WHERE "status" != 'CANCELLED'
    GROUP BY EXTRACT(DOW FROM "createdAt")
  `;

  const dayNames = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
  const daysOfWeek = [
    { name: 'Ponedjeljak', sales: 0, revenue: 0 },
    { name: 'Utorak', sales: 0, revenue: 0 },
    { name: 'Srijeda', sales: 0, revenue: 0 },
    { name: 'Četvrtak', sales: 0, revenue: 0 },
    { name: 'Petak', sales: 0, revenue: 0 },
    { name: 'Subota', sales: 0, revenue: 0 },
    { name: 'Nedjelja', sales: 0, revenue: 0 }
  ];

  results.forEach(r => {
    // PostgreSQL DOW: 0=Sunday, 1=Monday... Prilagođavamo da 0=Monday
    const dayIndex = r.dow === 0 ? 6 : r.dow - 1;
    if (dayIndex >= 0 && dayIndex < 7) {
      daysOfWeek[dayIndex].sales = Number(r.sales);
      daysOfWeek[dayIndex].revenue = r.revenue || 0;
    }
  });

  return daysOfWeek;
}

// Funkcija za dohvaćanje analize prodaje po dobu dana (OPTIMIZOVANO sa SQL)
async function getSalesByTimeOfDay() {
  const results = await db.$queryRaw<Array<{ period: number; sales: bigint; revenue: number }>>`
    SELECT
      CASE
        WHEN EXTRACT(HOUR FROM "createdAt") >= 6 AND EXTRACT(HOUR FROM "createdAt") < 12 THEN 0
        WHEN EXTRACT(HOUR FROM "createdAt") >= 12 AND EXTRACT(HOUR FROM "createdAt") < 18 THEN 1
        WHEN EXTRACT(HOUR FROM "createdAt") >= 18 AND EXTRACT(HOUR FROM "createdAt") < 24 THEN 2
        ELSE 3
      END as period,
      COUNT(*)::bigint as sales,
      SUM("total")::float as revenue
    FROM "Order"
    WHERE "status" != 'CANCELLED'
    GROUP BY period
  `;

  const timeOfDay = [
    { name: 'Jutro (6-12h)', sales: 0, revenue: 0 },
    { name: 'Popodne (12-18h)', sales: 0, revenue: 0 },
    { name: 'Veče (18-24h)', sales: 0, revenue: 0 },
    { name: 'Noć (0-6h)', sales: 0, revenue: 0 }
  ];

  results.forEach(r => {
    if (r.period >= 0 && r.period < 4) {
      timeOfDay[r.period].sales = Number(r.sales);
      timeOfDay[r.period].revenue = r.revenue || 0;
    }
  });

  return timeOfDay;
}

// Funkcija za dohvaćanje analize zaliha
async function getInventoryAnalysis() {
  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      category: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      stock: 'asc'
    },
    take: 20 // Dohvaćamo 20 proizvoda s najmanjom zalihom
  });
  
  return products.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category?.name || 'Bez kategorije',
    stock: product.stock,
    value: product.price * product.stock
  }));
}

export default async function StatisticsPage() {
  // Dohvat inicijalnih podataka za statistiku
  const [
    salesByDate,
    topProducts,
    categoryStats,
    b2bUserStats,
    monthlySales,
    averageOrderValue,
    salesByDayOfWeek,
    salesByTimeOfDay,
    inventoryAnalysis
  ] = await Promise.all([
    getSalesByDate(30),
    getTopProducts(10),
    getCategoryStats(),
    getB2BUserStats(),
    getMonthlySales(),
    getAverageOrderValue(),
    getSalesByDayOfWeek(),
    getSalesByTimeOfDay(),
    getInventoryAnalysis()
  ]);
  
  // Priprema inicijalnih podataka za klijentsku komponentu
  const initialData = {
    salesByDate,
    topProducts: topProducts.map(product => ({
      id: product.productId, // Mapiranje productId u id
      name: product.name,
      sales: product.quantity, // Mapiranje quantity u sales
      revenue: product.revenue
    })),
    categoryStats: categoryStats.map((category, index) => ({
      id: `category-${index}`, // Dodajemo id jer ga nema u originalnim podacima
      name: category.name,
      sales: category.sales,
      revenue: category.revenue
    })),
    b2bUserStats: b2bUserStats.map(user => ({
      id: user.id,
      name: user.name,
      sales: user.totalOrders, // Mapiranje totalOrders u sales
      revenue: user.totalSpent // Mapiranje totalSpent u revenue
    })),
    monthlySales: monthlySales.map(month => ({
      month: month.name, // Mapiranje name u month
      sales: month.sales,
      revenue: month.revenue
    })),
    averageOrderValue,
    salesByDayOfWeek,
    salesByTimeOfDay,
    inventoryAnalysis
  };
  
  return (
    <div className="p-6">
      <StatisticsClient initialData={initialData} />
    </div>
  );
}
