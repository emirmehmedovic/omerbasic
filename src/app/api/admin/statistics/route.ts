import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { formatDate } from '@/lib/utils';

// Funkcija za dohvaćanje podataka o prodaji po datumu
async function getSalesByDate(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
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
async function getTopProducts(from: Date, to: Date, limit: number = 10) {
  const orderItems = await db.orderItem.findMany({
    where: {
      order: {
        createdAt: {
          gte: from,
          lte: to
        },
        status: {
          not: 'CANCELLED'
        }
      }
    },
    include: {
      product: true
    }
  });
  
  // Grupiranje po proizvodu
  const productStats = orderItems.reduce((acc, item) => {
    const productId = item.productId;
    
    if (!acc[productId]) {
      acc[productId] = {
        id: productId,
        name: item.product.name,
        sales: 0,
        revenue: 0
      };
    }
    
    acc[productId].sales += item.quantity;
    acc[productId].revenue += item.price * item.quantity;
    
    return acc;
  }, {} as Record<string, { id: string; name: string; sales: number; revenue: number }>);
  
  // Pretvaranje u niz i sortiranje po prodaji
  return Object.values(productStats)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

// Funkcija za dohvaćanje statistike po kategorijama
async function getCategoryStats(from: Date, to: Date) {
  const orderItems = await db.orderItem.findMany({
    where: {
      order: {
        createdAt: {
          gte: from,
          lte: to
        },
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
  const categoryStats = orderItems.reduce((acc, item) => {
    if (!item.product.category) return acc;
    
    const categoryId = item.product.categoryId;
    
    if (!acc[categoryId]) {
      acc[categoryId] = {
        id: categoryId,
        name: item.product.category.name,
        sales: 0,
        revenue: 0
      };
    }
    
    acc[categoryId].sales += item.quantity;
    acc[categoryId].revenue += item.price * item.quantity;
    
    return acc;
  }, {} as Record<string, { id: string; name: string; sales: number; revenue: number }>);
  
  // Pretvaranje u niz i sortiranje po prodaji
  return Object.values(categoryStats).sort((a, b) => b.sales - a.sales);
}

// Funkcija za dohvaćanje statistike B2B korisnika
async function getB2BUserStats(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: {
        not: 'CANCELLED'
      },
      user: {
        role: 'B2B'
      }
    },
    include: {
      user: true
    }
  });
  
  // Grupiranje po korisniku
  const userStats = orders.reduce((acc, order) => {
    if (!order.userId) return acc;
    
    const userId = order.userId;
    
    if (!acc[userId]) {
      acc[userId] = {
        id: userId,
        name: order.user?.name || 'Nepoznat korisnik',
        sales: 0,
        revenue: 0
      };
    }
    
    acc[userId].sales += 1;
    acc[userId].revenue += order.total;
    
    return acc;
  }, {} as Record<string, { id: string; name: string; sales: number; revenue: number }>);
  
  // Pretvaranje u niz i sortiranje po prihodu
  return Object.values(userStats).sort((a, b) => b.revenue - a.revenue);
}

// Funkcija za dohvaćanje mjesečne prodaje
async function getMonthlySales(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: {
        not: 'CANCELLED'
      }
    }
  });
  
  // Mapiranje brojeva mjeseci na nazive
  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];
  
  // Grupiranje po mjesecu
  const monthlySales = orders.reduce((acc, order) => {
    const month = order.createdAt.getMonth();
    const year = order.createdAt.getFullYear();
    const key = `${year}-${month}`;
    
    if (!acc[key]) {
      acc[key] = {
        month: `${monthNames[month]} ${year}`,
        sales: 0,
        revenue: 0,
        sortKey: `${year}${month.toString().padStart(2, '0')}`
      };
    }
    
    acc[key].sales += 1;
    acc[key].revenue += order.total;
    
    return acc;
  }, {} as Record<string, { month: string; sales: number; revenue: number; sortKey: string }>);
  
  // Pretvaranje u niz i sortiranje po datumu
  return Object.values(monthlySales)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

// Funkcija za dohvaćanje prosječne vrijednosti narudžbe
async function getAverageOrderValue(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: {
        not: 'CANCELLED'
      }
    }
  });
  
  if (orders.length === 0) return 0;
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  return totalRevenue / orders.length;
}

// Funkcija za dohvaćanje analize prodaje po danima u tjednu
async function getSalesByDayOfWeek(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: {
        not: 'CANCELLED'
      }
    }
  });
  
  // Mapiranje brojeva dana u tjednu na nazive
  const dayNames = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
  
  // Inicijalizacija rezultata za sve dane u tjednu
  const result = dayNames.map((name, index) => ({
    name,
    sales: 0,
    revenue: 0,
    dayIndex: index
  }));
  
  // Grupiranje po danu u tjednu
  orders.forEach(order => {
    const dayIndex = order.createdAt.getDay(); // 0 = nedjelja, 1 = ponedjeljak, itd.
    result[dayIndex].sales += 1;
    result[dayIndex].revenue += order.total;
  });
  
  // Sortiranje po indeksu dana (počevši od ponedjeljka)
  return [...result.slice(1), result[0]]; // Premještanje nedjelje na kraj
}

// Funkcija za dohvaćanje analize prodaje po dobu dana
async function getSalesByTimeOfDay(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: to
      },
      status: {
        not: 'CANCELLED'
      }
    }
  });
  
  // Definiranje doba dana
  const timeOfDay = [
    { name: 'Jutro (6-12h)', start: 6, end: 12, sales: 0, revenue: 0 },
    { name: 'Popodne (12-18h)', start: 12, end: 18, sales: 0, revenue: 0 },
    { name: 'Večer (18-24h)', start: 18, end: 24, sales: 0, revenue: 0 },
    { name: 'Noć (0-6h)', start: 0, end: 6, sales: 0, revenue: 0 }
  ];
  
  // Grupiranje po dobu dana
  orders.forEach(order => {
    const hour = order.createdAt.getHours();
    
    const period = timeOfDay.find(p => hour >= p.start && hour < p.end);
    if (period) {
      period.sales += 1;
      period.revenue += order.total;
    }
  });
  
  return timeOfDay;
}

// Funkcija za dohvaćanje analize zaliha
async function getInventoryAnalysis() {
  const products = await db.product.findMany({
    where: {
      stock: {
        lte: 20 // Proizvodi s manje od 20 komada na zalihi
      }
    },
    orderBy: {
      stock: 'asc' // Sortiranje od najmanje zalihe prema najvećoj
    },
    include: {
      category: true
    },
    take: 20 // Uzimamo samo 20 proizvoda s najmanjom zalihom
  });
  
  return products.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category?.name || 'Nepoznata kategorija',
    stock: product.stock,
    value: product.price * product.stock // Vrijednost zalihe
  }));
}

export async function GET(request: NextRequest) {
  // Provjera autentikacije i autorizacije
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Dohvaćanje parametara iz URL-a
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  
  // Postavljanje zadanih vrijednosti ako parametri nisu prisutni
  const from = fromParam ? new Date(fromParam) : (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  })();
  
  const to = toParam ? new Date(toParam) : new Date();
  
  try {
    // Paralelno dohvaćanje svih podataka
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
      getSalesByDate(from, to),
      getTopProducts(from, to, 10),
      getCategoryStats(from, to),
      getB2BUserStats(from, to),
      getMonthlySales(from, to),
      getAverageOrderValue(from, to),
      getSalesByDayOfWeek(from, to),
      getSalesByTimeOfDay(from, to),
      getInventoryAnalysis()
    ]);
    
    // Vraćanje svih podataka
    return NextResponse.json({
      salesByDate,
      topProducts,
      categoryStats,
      b2bUserStats,
      monthlySales,
      averageOrderValue,
      salesByDayOfWeek,
      salesByTimeOfDay,
      inventoryAnalysis
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju statistike:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
