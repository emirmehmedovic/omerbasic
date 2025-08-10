"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useDate } from "@/hooks/use-date-range";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportData } from "@/lib/exportUtils";

// Definicija tipova
interface PurchaseOrderStats {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  statusCounts: {
    status: string;
    count: number;
  }[];
  monthlyStats: {
    month: string;
    orders: number;
    amount: number;
  }[];
  topSuppliers: {
    supplierId: string;
    supplierName: string;
    orderCount: number;
    totalAmount: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    totalAmount: number;
  }[];
}

// Pomoćna funkcija za formatiranje statusa
const formatStatus = (status: string) => {
  switch (status) {
    case "DRAFT": return "Nacrt";
    case "SENT": return "Poslano";
    case "CONFIRMED": return "Potvrđeno";
    case "PARTIALLY_RECEIVED": return "Djelomično primljeno";
    case "RECEIVED": return "Primljeno";
    case "CANCELLED": return "Otkazano";
    default: return status;
  }
};

// Boje za grafikone
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PurchaseOrderStatisticsClient() {
  const router = useRouter();
  const { startDate, endDate } = useDate();
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [exportType, setExportType] = useState<"csv" | "json" | "excel">("csv");
  const [exportDataType, setExportDataType] = useState<string>("orders");

  // Dohvati statistiku
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      let url = "/api/purchase-orders/statistics?";
      
      if (startDate && endDate) {
        url += `fromDate=${startDate.toISOString()}&toDate=${endDate.toISOString()}&`;
      }
      
      if (statusFilter) {
        url += `status=${statusFilter}&`;
      }
      
      if (supplierFilter) {
        url += `supplierId=${supplierFilter}&`;
      }
      
      const response = await axios.get(url);
      setStats(response.data);
    } catch (error) {
      console.error("Greška pri dohvaćanju statistike:", error);
    } finally {
      setLoading(false);
    }
  };

  // Dohvati dobavljače za filter
  const fetchSuppliers = async () => {
    try {
      const response = await axios.get("/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Greška pri dohvaćanju dobavljača:", error);
    }
  };

  useEffect(() => {
    fetchStatistics();
    fetchSuppliers();
  }, [startDate, endDate, statusFilter, supplierFilter]);

  // Izvoz podataka
  const handleExport = () => {
    if (!stats) return;
    
    let data: any[] = [];
    let filename = `narudzbenice-statistika-${format(new Date(), "yyyy-MM-dd")}`;
    
    switch (exportDataType) {
      case "orders":
        // Izvoz svih narudžbenica
        filename = `narudzbenice-${format(new Date(), "yyyy-MM-dd")}`;
        // Ovdje bi trebalo dohvatiti sve narudžbenice za izvoz
        // Za sada koristimo mjesečnu statistiku kao primjer
        data = stats.monthlyStats.map(item => ({
          Mjesec: item.month,
          'Broj narudžbi': item.orders,
          'Ukupan iznos': item.amount.toFixed(2) + ' KM',
        }));
        break;
      case "suppliers":
        // Izvoz statistike dobavljača
        filename = `dobavljaci-statistika-${format(new Date(), "yyyy-MM-dd")}`;
        data = stats.topSuppliers.map(item => ({
          Dobavljač: item.supplierName,
          'Broj narudžbi': item.orderCount,
          'Ukupan iznos': item.totalAmount.toFixed(2) + ' KM',
        }));
        break;
      case "products":
        // Izvoz statistike proizvoda
        filename = `proizvodi-statistika-${format(new Date(), "yyyy-MM-dd")}`;
        data = stats.topProducts.map(item => ({
          Proizvod: item.productName,
          Količina: item.quantity,
          'Ukupan iznos': item.totalAmount.toFixed(2) + ' KM',
        }));
        break;
      case "status":
        // Izvoz statistike po statusima
        filename = `statusi-statistika-${format(new Date(), "yyyy-MM-dd")}`;
        data = stats.statusCounts.map(item => ({
          Status: formatStatus(item.status),
          'Broj narudžbi': item.count,
        }));
        break;
    }
    
    // Generiranje zaglavlja na temelju prvog objekta u podacima
    const headers = data.length > 0
      ? Object.keys(data[0]).map(key => ({ key, label: key }))
      : [];
    
    // Poziv exportData s ispravnim parametrima
    exportData(data, headers, {
      format: exportType as 'csv' | 'json' | 'excel',
      fileName: filename
    });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title="Statistika narudžbenica"
          description="Pregled statistike i analitike narudžbenica"
        />
        <Button
          variant="outline"
          onClick={() => router.push("/admin/purchase-orders")}
        >
          Natrag na narudžbenice
        </Button>
      </div>
      <Separator />
      
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Vremenski period</label>
          <DateRangePicker />
        </div>
        
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Svi statusi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="DRAFT">Nacrt</SelectItem>
              <SelectItem value="SENT">Poslano</SelectItem>
              <SelectItem value="CONFIRMED">Potvrđeno</SelectItem>
              <SelectItem value="PARTIALLY_RECEIVED">Djelomično primljeno</SelectItem>
              <SelectItem value="RECEIVED">Primljeno</SelectItem>
              <SelectItem value="CANCELLED">Otkazano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Dobavljač</label>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Svi dobavljači" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi dobavljači</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Izvoz podataka */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={exportDataType} onValueChange={setExportDataType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tip podataka" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Narudžbenice</SelectItem>
            <SelectItem value="suppliers">Dobavljači</SelectItem>
            <SelectItem value="products">Proizvodi</SelectItem>
            <SelectItem value="status">Statusi</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Format izvoza" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={handleExport} disabled={!stats}>
          <FileDown className="mr-2 h-4 w-4" />
          Izvoz podataka
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Učitavanje statistike...</p>
        </div>
      ) : !stats ? (
        <div className="flex items-center justify-center h-64">
          <p>Nema dostupnih podataka za odabrani period.</p>
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Pregled</TabsTrigger>
              <TabsTrigger value="monthly">Mjesečna statistika</TabsTrigger>
              <TabsTrigger value="suppliers">Dobavljači</TabsTrigger>
              <TabsTrigger value="products">Proizvodi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ukupno narudžbenica</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ukupan iznos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAmount.toFixed(2)} KM</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Prosječna vrijednost narudžbe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.averageOrderValue.toFixed(2)} KM</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Narudžbenice po statusu</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.statusCounts}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="status"
                          label={({ name, value }: any) => `${formatStatus(name)}: ${value}`}
                        >
                          {stats.statusCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, formatStatus(name as string)]} />
                        <Legend formatter={(value) => formatStatus(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Mjesečni trend narudžbi</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats.monthlyStats}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} />
                        <Legend />
                        <Line type="monotone" dataKey="orders" name="Broj narudžbi" stroke="#8884d8" />
                        <Line type="monotone" dataKey="amount" name="Iznos (KM)" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="monthly" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mjesečna statistika narudžbenica</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.monthlyStats}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="orders" name="Broj narudžbi" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="amount" name="Iznos (KM)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Detaljna mjesečna statistika</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Mjesec</th>
                          <th className="text-right py-2 px-4">Broj narudžbi</th>
                          <th className="text-right py-2 px-4">Ukupan iznos (KM)</th>
                          <th className="text-right py-2 px-4">Prosječna vrijednost (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.monthlyStats.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{item.month}</td>
                            <td className="text-right py-2 px-4">{item.orders}</td>
                            <td className="text-right py-2 px-4">{item.amount.toFixed(2)}</td>
                            <td className="text-right py-2 px-4">
                              {item.orders > 0 ? (item.amount / item.orders).toFixed(2) : "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="suppliers" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top dobavljači po broju narudžbi</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topSuppliers}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="supplierName" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="orderCount" name="Broj narudžbi" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Top dobavljači po ukupnom iznosu</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topSuppliers}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="supplierName" width={150} />
                      <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) + ' KM' : value} />
                      <Legend />
                      <Bar dataKey="totalAmount" name="Ukupan iznos (KM)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Detaljna statistika dobavljača</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Dobavljač</th>
                          <th className="text-right py-2 px-4">Broj narudžbi</th>
                          <th className="text-right py-2 px-4">Ukupan iznos (KM)</th>
                          <th className="text-right py-2 px-4">Prosječna vrijednost (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topSuppliers.map((item) => (
                          <tr key={item.supplierId} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{item.supplierName}</td>
                            <td className="text-right py-2 px-4">{item.orderCount}</td>
                            <td className="text-right py-2 px-4">{item.totalAmount.toFixed(2)}</td>
                            <td className="text-right py-2 px-4">
                              {item.orderCount > 0 ? (item.totalAmount / item.orderCount).toFixed(2) : "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="products" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top proizvodi po količini</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topProducts}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="productName" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantity" name="Količina" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Top proizvodi po ukupnom iznosu</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.topProducts}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="productName" width={150} />
                      <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) + ' KM' : value} />
                      <Legend />
                      <Bar dataKey="totalAmount" name="Ukupan iznos (KM)" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Detaljna statistika proizvoda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Proizvod</th>
                          <th className="text-right py-2 px-4">Količina</th>
                          <th className="text-right py-2 px-4">Ukupan iznos (KM)</th>
                          <th className="text-right py-2 px-4">Prosječna cijena (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topProducts.map((item) => (
                          <tr key={item.productId} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-4">{item.productName}</td>
                            <td className="text-right py-2 px-4">{item.quantity}</td>
                            <td className="text-right py-2 px-4">{item.totalAmount.toFixed(2)}</td>
                            <td className="text-right py-2 px-4">
                              {item.quantity > 0 ? (item.totalAmount / item.quantity).toFixed(2) : "0.00"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  );
}
