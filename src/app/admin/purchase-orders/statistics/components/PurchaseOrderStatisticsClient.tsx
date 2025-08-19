"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileDown, BarChart3, TrendingUp, Building2, Package, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
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
const COLORS = ['#f59e0b', '#ea580c', '#a16207', '#d97706', '#fbbf24', '#fcd34d'];

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
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white via-gray-50/80 to-blue-50/60 backdrop-blur-sm rounded-2xl p-6 border border-amber/20 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin/purchase-orders")}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm rounded-lg border border-amber/30">
                <BarChart3 className="w-6 h-6 text-amber" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-amber to-orange bg-clip-text text-transparent">
                  Statistika narudžbenica
                </h1>
                <p className="text-gray-600 mt-1">Pregled statistike i analitike narudžbenica</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filteri</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1 block text-gray-700">Vremenski period</label>
            <DateRangePicker />
          </div>
          
          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-1 block text-gray-700">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500">
                <SelectValue placeholder="Svi statusi" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-amber/20 rounded-xl shadow-lg">
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
            <label className="text-sm font-medium mb-1 block text-gray-700">Dobavljač</label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900 placeholder:text-gray-500">
                <SelectValue placeholder="Svi dobavljači" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-amber/20 rounded-xl shadow-lg">
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
      </div>
      
      {/* Export Section */}
      <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20 shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Izvoz podataka</h3>
        <div className="flex flex-wrap gap-3">
          <Select value={exportDataType} onValueChange={setExportDataType}>
            <SelectTrigger className="w-[180px] bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
              <SelectValue placeholder="Tip podataka" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-amber/20 rounded-xl shadow-lg">
              <SelectItem value="orders">Narudžbenice</SelectItem>
              <SelectItem value="suppliers">Dobavljači</SelectItem>
              <SelectItem value="products">Proizvodi</SelectItem>
              <SelectItem value="status">Statusi</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
            <SelectTrigger className="w-[180px] bg-white border-amber/30 focus:border-amber rounded-xl transition-all duration-200 text-gray-900">
              <SelectValue placeholder="Format izvoza" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-amber/20 rounded-xl shadow-lg">
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={!stats}
            className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-xl transition-all duration-200 shadow-sm"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Izvoz podataka
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20">
          <p className="text-gray-600">Učitavanje statistike...</p>
        </div>
      ) : !stats ? (
        <div className="flex items-center justify-center h-64 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm rounded-2xl border border-amber/20">
          <p className="text-gray-600">Nema dostupnih podataka za odabrani period.</p>
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 rounded-xl p-1">
              <TabsTrigger value="overview" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Pregled</TabsTrigger>
              <TabsTrigger value="monthly" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Mjesečna statistika</TabsTrigger>
              <TabsTrigger value="suppliers" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Dobavljači</TabsTrigger>
              <TabsTrigger value="products" className="text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber data-[state=active]:via-orange data-[state=active]:to-brown data-[state=active]:text-white rounded-lg transition-all duration-200">Proizvodi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <BarChart3 className="w-5 h-5 text-amber" />
                      Ukupno narudžbenica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <TrendingUp className="w-5 h-5 text-amber" />
                      Ukupan iznos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-gray-900">{stats.totalAmount.toFixed(2)} KM</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <TrendingUp className="w-5 h-5 text-amber" />
                      Prosječna vrijednost
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-3xl font-bold text-gray-900">{stats.averageOrderValue.toFixed(2)} KM</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <BarChart3 className="w-5 h-5 text-amber" />
                      Narudžbenice po statusu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
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
                
                <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <TrendingUp className="w-5 h-5 text-amber" />
                      Mjesečni trend narudžbi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
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
                        <Line type="monotone" dataKey="orders" name="Broj narudžbi" stroke="#f59e0b" />
                        <Line type="monotone" dataKey="amount" name="Iznos (KM)" stroke="#ea580c" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="monthly" className="space-y-6">
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BarChart3 className="w-5 h-5 text-amber" />
                    Mjesečna statistika narudžbenica
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.monthlyStats}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" />
                      <YAxis yAxisId="right" orientation="right" stroke="#ea580c" />
                      <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="orders" name="Broj narudžbi" fill="#f59e0b" />
                      <Bar yAxisId="right" dataKey="amount" name="Iznos (KM)" fill="#ea580c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BarChart3 className="w-5 h-5 text-amber" />
                    Detaljna mjesečna statistika
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-amber/20">
                          <th className="text-left py-3 px-4 text-gray-700 font-medium">Mjesec</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Broj narudžbi</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Ukupan iznos (KM)</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Prosječna vrijednost (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.monthlyStats.map((item, index) => (
                          <tr key={index} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                            <td className="py-3 px-4 text-gray-900">{item.month}</td>
                            <td className="text-right py-3 px-4 text-gray-900 font-medium">{item.orders}</td>
                            <td className="text-right py-3 px-4 text-gray-900">{item.amount.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 text-gray-900">
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
            
            <TabsContent value="suppliers" className="space-y-6">
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-5 h-5 text-amber" />
                    Top dobavljači po broju narudžbi
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
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
                      <Bar dataKey="orderCount" name="Broj narudžbi" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-5 h-5 text-amber" />
                    Top dobavljači po ukupnom iznosu
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
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
                      <Bar dataKey="totalAmount" name="Ukupan iznos (KM)" fill="#ea580c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Building2 className="w-5 h-5 text-amber" />
                    Detaljna statistika dobavljača
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-amber/20">
                          <th className="text-left py-3 px-4 text-gray-700 font-medium">Dobavljač</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Broj narudžbi</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Ukupan iznos (KM)</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Prosječna vrijednost (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topSuppliers.map((item) => (
                          <tr key={item.supplierId} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                            <td className="py-3 px-4 text-gray-900">{item.supplierName}</td>
                            <td className="text-right py-3 px-4 text-gray-900 font-medium">{item.orderCount}</td>
                            <td className="text-right py-3 px-4 text-gray-900">{item.totalAmount.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 text-gray-900">
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
            
            <TabsContent value="products" className="space-y-6">
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="w-5 h-5 text-amber" />
                    Top proizvodi po količini
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
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
                      <Bar dataKey="quantity" name="Količina" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="w-5 h-5 text-amber" />
                    Top proizvodi po ukupnom iznosu
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] pt-4">
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
                      <Bar dataKey="totalAmount" name="Ukupan iznos (KM)" fill="#ea580c" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border border-amber/20 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Package className="w-5 h-5 text-amber" />
                    Detaljna statistika proizvoda
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-amber/20">
                          <th className="text-left py-3 px-4 text-gray-700 font-medium">Proizvod</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Količina</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Ukupan iznos (KM)</th>
                          <th className="text-right py-3 px-4 text-gray-700 font-medium">Prosječna cijena (KM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topProducts.map((item) => (
                          <tr key={item.productId} className="border-b border-amber/10 hover:bg-amber/5 transition-colors">
                            <td className="py-3 px-4 text-gray-900">{item.productName}</td>
                            <td className="text-right py-3 px-4 text-gray-900 font-medium">{item.quantity}</td>
                            <td className="text-right py-3 px-4 text-gray-900">{item.totalAmount.toFixed(2)}</td>
                            <td className="text-right py-3 px-4 text-gray-900">
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
