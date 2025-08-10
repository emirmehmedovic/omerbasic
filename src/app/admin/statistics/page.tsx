import { db } from '@/lib/db';
import { formatDate, formatPrice } from '@/lib/utils';
import { StatisticsClient } from '@/components/admin/StatisticsClient';

// Funkcija za dohvaćanje podataka o prodaji po datumu
async function getSalesByDate(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: startDate
      },
      status: {
        not: 'CANCELLED'
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  // Grupiranje po datumu
  const salesByDate = orders.reduce((acc, order) => {
    const dateStr = formatDate(order.createdAt, 'dd.MM.yyyy');
    
    if (!acc[dateStr]) {
      acc[dateStr] = {
        date: dateStr,
        sales: 0,
        revenue: 0
      };
    }
    
    acc[dateStr].sales += 1;
    acc[dateStr].revenue += order.total;
    
    return acc;
  }, {} as Record<string, { date: string; sales: number; revenue: number }>);
  
  // Pretvaranje u niz i sortiranje po datumu
  return Object.values(salesByDate).sort((a, b) => {
    const [aDay, aMonth, aYear] = a.date.split('.');
    const [bDay, bMonth, bYear] = b.date.split('.');
    
    const dateA = new Date(`${aYear}-${aMonth}-${aDay}`);
    const dateB = new Date(`${bYear}-${bMonth}-${bDay}`);
    
    return dateA.getTime() - dateB.getTime();
  });
}

// Funkcija za dohvaćanje najprodavanijih proizvoda
async function getTopProducts(limit: number = 10) {
  // Dohvaćamo OrderItems s povezanim proizvodima i kategorijama
  const orderItems = await db.orderItem.findMany({
    where: {
      order: {
        status: {
          not: 'CANCELLED'
        }
      }
    },
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  });
  
  // Grupiranje po proizvodu
  const productMap: Record<string, { productId: string; name: string; category: string; quantity: number; revenue: number }> = {};
  
  for (const item of orderItems) {
    if (!item.product) continue;
    
    const productId = item.productId;
    
    if (!productMap[productId]) {
      productMap[productId] = {
        productId,
        name: item.product.name,
        category: item.product.category?.name || 'Bez kategorije',
        quantity: 0,
        revenue: 0
      };
    }
    
    productMap[productId].quantity += item.quantity;
    productMap[productId].revenue += item.price * item.quantity;
  }
  
  // Pretvaranje u niz i sortiranje po količini
  return Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

// Funkcija za dohvaćanje statistike po kategorijama
async function getCategoryStats() {
  const orderItems = await db.orderItem.findMany({
    where: {
      order: {
        status: {
          not: 'CANCELLED'
        }
      }
    },
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  });
  
  // Grupiranje po kategoriji
  const categoryMap: Record<string, { name: string; sales: number; revenue: number }> = {};
  
  for (const item of orderItems) {
    if (!item.product) continue;
    
    const categoryName = item.product.category?.name || 'Bez kategorije';
    
    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = {
        name: categoryName,
        sales: 0,
        revenue: 0
      };
    }
    
    categoryMap[categoryName].sales += item.quantity;
    categoryMap[categoryName].revenue += item.price * item.quantity;
  }
  
  // Pretvaranje u niz i sortiranje po prodaji
  return Object.values(categoryMap).sort((a, b) => b.sales - a.sales);
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

// Funkcija za dohvaćanje mjesečne prodaje
async function getMonthlySales(year: number = new Date().getFullYear()) {
  const startDate = new Date(year, 0, 1); // 1. siječanj tekuće godine
  const endDate = new Date(year, 11, 31); // 31. prosinac tekuće godine
  
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: {
        not: 'CANCELLED'
      }
    }
  });
  
  // Inicijalizacija mjeseci
  const months = [
    { name: 'Januar', sales: 0, revenue: 0 },
    { name: 'Februar', sales: 0, revenue: 0 },
    { name: 'Mart', sales: 0, revenue: 0 },
    { name: 'April', sales: 0, revenue: 0 },
    { name: 'Maj', sales: 0, revenue: 0 },
    { name: 'Juni', sales: 0, revenue: 0 },
    { name: 'Juli', sales: 0, revenue: 0 },
    { name: 'August', sales: 0, revenue: 0 },
    { name: 'Septembar', sales: 0, revenue: 0 },
    { name: 'Oktobar', sales: 0, revenue: 0 },
    { name: 'Novembar', sales: 0, revenue: 0 },
    { name: 'Decembar', sales: 0, revenue: 0 }
  ];
  
  // Grupiranje po mjesecu
  orders.forEach(order => {
    const month = order.createdAt.getMonth();
    months[month].sales += 1;
    months[month].revenue += order.total;
  });
  
  return months;
}

// Funkcija za dohvaćanje prosječne vrijednosti narudžbe
async function getAverageOrderValue() {
  const orders = await db.order.findMany({
    where: {
      status: {
        not: 'CANCELLED'
      }
    },
    select: {
      total: true
    }
  });
  
  if (orders.length === 0) return 0;
  
  const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
  return totalValue / orders.length;
}

// Funkcija za dohvaćanje analize prodaje po danima u tjednu
async function getSalesByDayOfWeek() {
  const orders = await db.order.findMany({
    where: {
      status: {
        not: 'CANCELLED'
      }
    },
    select: {
      createdAt: true,
      total: true
    }
  });
  
  const daysOfWeek = [
    { name: 'Ponedjeljak', sales: 0, revenue: 0 },
    { name: 'Utorak', sales: 0, revenue: 0 },
    { name: 'Srijeda', sales: 0, revenue: 0 },
    { name: 'Četvrtak', sales: 0, revenue: 0 },
    { name: 'Petak', sales: 0, revenue: 0 },
    { name: 'Subota', sales: 0, revenue: 0 },
    { name: 'Nedjelja', sales: 0, revenue: 0 }
  ];
  
  orders.forEach(order => {
    // getDay() vraća 0 za nedjelju, 1 za ponedjeljak, itd.
    // Prilagođavamo indeks da 0 bude ponedjeljak
    const dayIndex = order.createdAt.getDay() === 0 ? 6 : order.createdAt.getDay() - 1;
    daysOfWeek[dayIndex].sales += 1;
    daysOfWeek[dayIndex].revenue += order.total;
  });
  
  return daysOfWeek;
}

// Funkcija za dohvaćanje analize prodaje po dobu dana
async function getSalesByTimeOfDay() {
  const orders = await db.order.findMany({
    where: {
      status: {
        not: 'CANCELLED'
      }
    },
    select: {
      createdAt: true,
      total: true
    }
  });
  
  const timeOfDay = [
    { name: 'Jutro (6-12h)', sales: 0, revenue: 0 },
    { name: 'Popodne (12-18h)', sales: 0, revenue: 0 },
    { name: 'Veče (18-24h)', sales: 0, revenue: 0 },
    { name: 'Noć (0-6h)', sales: 0, revenue: 0 }
  ];
  
  orders.forEach(order => {
    const hour = order.createdAt.getHours();
    let periodIndex;
    
    if (hour >= 6 && hour < 12) periodIndex = 0; // Jutro
    else if (hour >= 12 && hour < 18) periodIndex = 1; // Popodne
    else if (hour >= 18 && hour < 24) periodIndex = 2; // Veče
    else periodIndex = 3; // Noć
    
    timeOfDay[periodIndex].sales += 1;
    timeOfDay[periodIndex].revenue += order.total;
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
