'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatisticsCharts, SalesByDate, TopProduct, CategoryStat, B2BUserStat, MonthlySale, DayOfWeekStat, TimeOfDayStat, InventoryItem } from '@/components/admin/StatisticsCharts';
import { DateRangeFilter, DateRangeFilterValue } from '@/components/admin/DateRangeFilter';
import { useDateRange } from '@/contexts/DateRangeContext';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { exportData, ExportFormat, ExportOptions } from '@/lib/exportUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Tipovi podataka koje vraća API
interface ApiStatisticsData {
  salesByDate: Array<{ date: string; sales: number; revenue: number }>;
  topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
  categoryStats: Array<{ id: string; name: string; sales: number; revenue: number }>;
  b2bUserStats: Array<{ id: string; name: string; sales: number; revenue: number }>;
  monthlySales: Array<{ month: string; sales: number; revenue: number; sortKey?: string }>;
  averageOrderValue: number;
  salesByDayOfWeek: Array<{ name: string; sales: number; revenue: number; dayIndex?: number }>;
  salesByTimeOfDay: Array<{ name: string; sales: number; revenue: number }>;
  inventoryAnalysis: Array<{ id: string; name: string; category: string; stock: number; value: number }>;
}

// Tipovi podataka koje očekuje StatisticsCharts komponenta
interface StatisticsData {
  salesByDate: SalesByDate[];
  topProducts: TopProduct[];
  categoryStats: CategoryStat[];
  b2bUserStats: B2BUserStat[];
  monthlySales: MonthlySale[];
  salesByDayOfWeek: DayOfWeekStat[];
  salesByTimeOfDay: TimeOfDayStat[];
  inventoryAnalysis: InventoryItem[];
}

interface StatisticsClientProps {
  initialData: ApiStatisticsData;
}

export function StatisticsClient({ initialData }: StatisticsClientProps) {
  const { dateRangeFilter, setDateRangeFilter } = useDateRange();
  const [apiData, setApiData] = useState<ApiStatisticsData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  
  // Funkcija za dohvaćanje podataka prema odabranom vremenskom periodu
  const fetchData = async () => {
    if (!dateRangeFilter.dateRange?.from) return;
    
    setIsLoading(true);
    
    try {
      // Formatiranje datuma za API poziv
      const from = dateRangeFilter.dateRange.from.toISOString();
      const to = dateRangeFilter.dateRange.to ? dateRangeFilter.dateRange.to.toISOString() : new Date().toISOString();
      
      const response = await axios.get<ApiStatisticsData>('/api/admin/statistics', {
        params: { from, to }
      });
      
      setApiData(response.data);
    } catch (error) {
      console.error('Greška pri dohvaćanju statistike:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Dohvaćanje podataka kada se promijeni vremenski period
  useEffect(() => {
    fetchData();
  }, [dateRangeFilter]);
  
  // Funkcija za promjenu vremenskog perioda
  const handleDateRangeChange = (value: DateRangeFilterValue) => {
    setDateRangeFilter(value);
  };
  
  // Stanje za format izvoza
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  // Funkcija za izvoz podataka u odabranom formatu
  const handleExport = (dataType: string) => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    switch (dataType) {
      case 'salesByDate':
        exportData(
          apiData.salesByDate,
          [
            { key: 'date', label: 'Datum' },
            { key: 'sales', label: 'Broj narudžbi' },
            { key: 'revenue', label: 'Prihod' }
          ],
          { format: exportFormat, fileName: `prodaja-po-datumu-${currentDate}` }
        );
        break;
        
      case 'topProducts':
        exportData(
          apiData.topProducts,
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Naziv proizvoda' },
            { key: 'sales', label: 'Prodana količina' },
            { key: 'revenue', label: 'Prihod' }
          ],
          { format: exportFormat, fileName: `najprodavaniji-proizvodi-${currentDate}` }
        );
        break;
        
      case 'categoryStats':
        exportData(
          apiData.categoryStats,
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Kategorija' },
            { key: 'sales', label: 'Broj narudžbi' },
            { key: 'revenue', label: 'Prihod' }
          ],
          { format: exportFormat, fileName: `statistika-po-kategorijama-${currentDate}` }
        );
        break;
        
      case 'b2bUserStats':
        exportData(
          apiData.b2bUserStats,
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Korisnik' },
            { key: 'sales', label: 'Broj narudžbi' },
            { key: 'revenue', label: 'Potrošeno' }
          ],
          { format: exportFormat, fileName: `b2b-korisnici-${currentDate}` }
        );
        break;
        
      case 'inventoryAnalysis':
        exportData(
          apiData.inventoryAnalysis,
          [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Proizvod' },
            { key: 'category', label: 'Kategorija' },
            { key: 'stock', label: 'Stanje' },
            { key: 'value', label: 'Vrijednost' }
          ],
          { format: exportFormat, fileName: `analiza-zaliha-${currentDate}` }
        );
        break;
        
      default:
        // Izvoz svih podataka
        exportData(
          apiData.salesByDate,
          [
            { key: 'date', label: 'Datum' },
            { key: 'sales', label: 'Broj narudžbi' },
            { key: 'revenue', label: 'Prihod' }
          ],
          { format: exportFormat, fileName: `statistika-${currentDate}` }
        );
    }
  };
  
  // Mapiranje podataka iz API formata u format koji očekuje StatisticsCharts komponenta
  const mappedData: StatisticsData = {
    // SalesByDate ima isti format
    salesByDate: apiData.salesByDate,
    
    // Mapiranje topProducts
    topProducts: apiData.topProducts.map(product => ({
      productId: product.id,
      name: product.name,
      category: '', // API ne vraća kategoriju, pa stavljamo prazno
      quantity: product.sales, // API koristi 'sales' umjesto 'quantity'
      revenue: product.revenue
    })),
    
    // CategoryStat ima isti format
    categoryStats: apiData.categoryStats,
    
    // Mapiranje B2BUserStats
    b2bUserStats: apiData.b2bUserStats.map(user => ({
      id: user.id,
      name: user.name,
      totalOrders: user.sales, // API koristi 'sales' umjesto 'totalOrders'
      totalSpent: user.revenue, // API koristi 'revenue' umjesto 'totalSpent'
      lastOrderDate: null // API ne vraća lastOrderDate, pa stavljamo null
    })),
    
    // Mapiranje monthlySales
    monthlySales: apiData.monthlySales.map(month => ({
      name: month.month, // API koristi 'month' umjesto 'name'
      sales: month.sales,
      revenue: month.revenue
    })),
    
    // DayOfWeekStat i TimeOfDayStat imaju isti format
    salesByDayOfWeek: apiData.salesByDayOfWeek,
    salesByTimeOfDay: apiData.salesByTimeOfDay,
    
    // InventoryItem ima isti format
    inventoryAnalysis: apiData.inventoryAnalysis
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Statistika</h1>
          {isLoading && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary ml-2"></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangeFilter 
            onChange={handleDateRangeChange} 
            defaultValue={dateRangeFilter}
          />
          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Izvoz podataka
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Format izvoza</h4>
                    <Tabs 
                      defaultValue="csv" 
                      className="w-full" 
                      onValueChange={(value) => setExportFormat(value as ExportFormat)}
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="csv" className="flex items-center gap-1">
                          <FileText className="h-4 w-4" /> CSV
                        </TabsTrigger>
                        <TabsTrigger value="json" className="flex items-center gap-1">
                          <FileJson className="h-4 w-4" /> JSON
                        </TabsTrigger>
                        <TabsTrigger value="excel" className="flex items-center gap-1">
                          <FileSpreadsheet className="h-4 w-4" /> Excel
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Podaci za izvoz</h4>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExport('salesByDate')}
                        className="justify-start"
                      >
                        Prodaja po datumu
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExport('topProducts')}
                        className="justify-start"
                      >
                        Najprodavaniji proizvodi
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExport('categoryStats')}
                        className="justify-start"
                      >
                        Statistika po kategorijama
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExport('b2bUserStats')}
                        className="justify-start"
                      >
                        B2B korisnici
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExport('inventoryAnalysis')}
                        className="justify-start"
                      >
                        Analiza zaliha
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-white to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prosječna vrijednost narudžbe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(apiData.averageOrderValue)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-white to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupno narudžbi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiData.salesByDate.reduce((sum, day) => sum + day.sales, 0)}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-white to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupni prihod</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(apiData.salesByDate.reduce((sum, day) => sum + day.revenue, 0))}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-white to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Proizvodi s niskom zalihom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiData.inventoryAnalysis.filter(p => p.stock < 5).length}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gradient-to-br from-white to-gray-100 border-gray-200">
        <CardHeader>
          <CardTitle>Statistika prodaje i proizvoda</CardTitle>
          <CardDescription>
            {dateRangeFilter.preset === 'custom' 
              ? `Period: ${dateRangeFilter.dateRange?.from?.toLocaleDateString()} - ${dateRangeFilter.dateRange?.to?.toLocaleDateString() || 'danas'}`
              : dateRangeFilter.preset === '7d' ? 'Zadnjih 7 dana'
              : dateRangeFilter.preset === '30d' ? 'Zadnjih 30 dana'
              : dateRangeFilter.preset === '90d' ? 'Zadnjih 90 dana'
              : dateRangeFilter.preset === '1y' ? 'Zadnjih godinu dana'
              : 'Odabrani period'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <StatisticsCharts 
              salesByDate={mappedData.salesByDate}
              topProducts={mappedData.topProducts}
              categoryStats={mappedData.categoryStats}
              b2bUserStats={mappedData.b2bUserStats}
              monthlySales={mappedData.monthlySales}
              salesByDayOfWeek={mappedData.salesByDayOfWeek}
              salesByTimeOfDay={mappedData.salesByTimeOfDay}
              inventoryAnalysis={mappedData.inventoryAnalysis}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
