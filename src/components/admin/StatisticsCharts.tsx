'use client';

import { formatPrice, formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Scatter 
} from 'recharts';

// Tipovi podataka za statistiku
export interface SalesByDate {
  date: string;
  sales: number;
  revenue: number;
  [key: string]: string | number;
}

export interface TopProduct {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  [key: string]: string | number;
}

export interface CategoryStat {
  name: string;
  sales: number;
  revenue: number;
  [key: string]: string | number;
}

export interface B2BUserStat {
  id: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  [key: string]: string | number | Date | null;
}

export interface MonthlySale {
  name: string;
  sales: number;
  revenue: number;
  [key: string]: string | number;
}

export interface DayOfWeekStat {
  name: string;
  sales: number;
  revenue: number;
  [key: string]: string | number;
}

export interface TimeOfDayStat {
  name: string;
  sales: number;
  revenue: number;
  [key: string]: string | number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  value: number;
  [key: string]: string | number;
}

interface StatisticsChartsProps {
  salesByDate: SalesByDate[];
  topProducts: TopProduct[];
  categoryStats: CategoryStat[];
  b2bUserStats: B2BUserStat[];
  monthlySales: MonthlySale[];
  salesByDayOfWeek: DayOfWeekStat[];
  salesByTimeOfDay: TimeOfDayStat[];
  inventoryAnalysis: InventoryItem[];
}

export function StatisticsCharts({
  salesByDate,
  topProducts,
  categoryStats,
  b2bUserStats,
  monthlySales,
  salesByDayOfWeek,
  salesByTimeOfDay,
  inventoryAnalysis
}: StatisticsChartsProps) {
  // Boje za grafikone
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Prodaja</TabsTrigger>
          <TabsTrigger value="products">Proizvodi</TabsTrigger>
          <TabsTrigger value="categories">Kategorije</TabsTrigger>
          <TabsTrigger value="b2b">B2B Korisnici</TabsTrigger>
          <TabsTrigger value="time">Vrijeme prodaje</TabsTrigger>
          <TabsTrigger value="inventory">Zalihe</TabsTrigger>
        </TabsList>
        
        {/* Tab za statistiku prodaje */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Trend prodaje (zadnjih 30 dana)</CardTitle>
                <CardDescription>Linijski prikaz kretanja prodaje i prihoda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={salesByDate}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'revenue') return formatPrice(value as number);
                        return value;
                      }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="sales" name="Broj narudžbi" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" name="Prihod" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Prodaja po danima (zadnjih 30 dana)</CardTitle>
                <CardDescription>Pregled broja narudžbi i prihoda po danima</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByDate}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'revenue') return formatPrice(value as number);
                        return value;
                      }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="sales" name="Broj narudžbi" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="revenue" name="Prihod" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Mjesečna prodaja ({new Date().getFullYear()})</CardTitle>
              <CardDescription>Pregled broja narudžbi i prihoda po mjesecima</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlySales}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return formatPrice(value as number);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="Broj narudžbi" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Prihod" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab za statistiku proizvoda */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Najprodavaniji proizvodi</CardTitle>
              <CardDescription>Top 10 proizvoda po broju prodanih komada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return formatPrice(value as number);
                      return value;
                    }} />
                    <Legend />
                    <Bar dataKey="quantity" name="Prodana količina" fill="#8884d8" />
                    <Bar dataKey="revenue" name="Prihod" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Proizvodi po kategorijama</CardTitle>
                <CardDescription>Distribucija proizvoda po kategorijama</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="sales"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.name}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Prihod po kategorijama</CardTitle>
                <CardDescription>Distribucija prihoda po kategorijama</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.name}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatPrice(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab za statistiku kategorija */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Prodaja po kategorijama</CardTitle>
                <CardDescription>Pregled prodaje i prihoda po kategorijama proizvoda</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryStats}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'revenue') return formatPrice(value as number);
                        return value;
                      }} />
                      <Legend />
                      <Bar dataKey="sales" name="Prodana količina" fill="#8884d8" />
                      <Bar dataKey="revenue" name="Prihod" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Radar analiza kategorija</CardTitle>
                <CardDescription>Usporedba kategorija po prodaji i prihodu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={150} width={500} height={400} data={categoryStats.slice(0, 5)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                      <Radar name="Prodaja" dataKey="sales" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Radar name="Prihod (x1000)" dataKey="revenue" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                      <Legend />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'Prihod (x1000)') return formatPrice(value as number);
                        return value;
                      }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Distribucija prodaje po kategorijama</CardTitle>
                <CardDescription>Udio kategorija u ukupnoj prodaji</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="sales"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.name}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab za statistiku B2B korisnika */}
        <TabsContent value="b2b" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>B2B korisnici po potrošnji</CardTitle>
              <CardDescription>Pregled B2B korisnika poredanih po ukupnoj potrošnji</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Kompanija/Korisnik</th>
                      <th className="text-left py-3 px-4">Broj narudžbi</th>
                      <th className="text-left py-3 px-4">Ukupna potrošnja</th>
                      <th className="text-left py-3 px-4">Zadnja narudžba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b2bUserStats.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{user.name}</td>
                        <td className="py-3 px-4">{user.totalOrders}</td>
                        <td className="py-3 px-4">{formatPrice(user.totalSpent)}</td>
                        <td className="py-3 px-4">
                          {user.lastOrderDate ? formatDate(user.lastOrderDate, 'dd.MM.yyyy') : 'Nema narudžbi'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>B2B korisnici po potrošnji</CardTitle>
              <CardDescription>Grafički prikaz potrošnje B2B korisnika</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={b2bUserStats.slice(0, 10)} // Prikazujemo samo top 10
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => formatPrice(value as number)} />
                    <Legend />
                    <Bar dataKey="totalSpent" name="Ukupna potrošnja" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab za statistiku vremena prodaje */}
        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prodaja po danima u tjednu</CardTitle>
              <CardDescription>Analiza prodaje po danima u tjednu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesByDayOfWeek}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return formatPrice(value as number);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="Broj narudžbi" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Prihod" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Prodaja po dobu dana</CardTitle>
              <CardDescription>Analiza prodaje po dobu dana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesByTimeOfDay}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return formatPrice(value as number);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="sales" name="Broj narudžbi" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="revenue" name="Prihod" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab za analizu zaliha */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Složena analiza zaliha</CardTitle>
                <CardDescription>Pregled stanja i vrijednosti zaliha po proizvodima</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={inventoryAnalysis.slice(0, 10)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'Vrijednost') return formatPrice(value as number);
                        return value;
                      }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="stock" name="Stanje" fill="#8884d8" />
                      <Line yAxisId="right" type="monotone" dataKey="value" name="Vrijednost" stroke="#82ca9d" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vrijednost zaliha po kategorijama</CardTitle>
                <CardDescription>Distribucija vrijednosti zaliha po kategorijama</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryAnalysis.reduce((acc, item) => {
                          const existingCategory = acc.find(c => c.name === item.category);
                          if (existingCategory) {
                            existingCategory.value += item.value;
                          } else {
                            acc.push({ name: item.category, value: item.value });
                          }
                          return acc;
                        }, [] as { name: string; value: number }[])}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.name}
                      >
                        {inventoryAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatPrice(value as number)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Analiza zaliha</CardTitle>
                <CardDescription>Pregled stanja i vrijednosti zaliha</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Proizvod</th>
                        <th className="text-left py-3 px-4">Kategorija</th>
                        <th className="text-left py-3 px-4">Stanje</th>
                        <th className="text-left py-3 px-4">Vrijednost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryAnalysis.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4">{item.category}</td>
                          <td className="py-3 px-4">{item.stock}</td>
                          <td className="py-3 px-4">{formatPrice(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Vrijednost zaliha po proizvodu</CardTitle>
              <CardDescription>Prikaz vrijednosti zaliha za proizvode s najnižom zalihom</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={inventoryAnalysis.slice(0, 10)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => formatPrice(value as number)} />
                    <Legend />
                    <Bar dataKey="value" name="Vrijednost zalihe" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
