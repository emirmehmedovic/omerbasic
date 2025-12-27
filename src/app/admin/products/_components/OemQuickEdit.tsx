"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Edit2, Hash, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface OemNumber {
  id: string;
  oemNumber: string;
  manufacturer?: string | null;
}

interface OemQuickEditProps {
  productId: string;
  productName: string;
  initialOemNumbers: OemNumber[];
  legacyOemNumber?: string | null;
}

export function OemQuickEdit({ 
  productId, 
  productName, 
  initialOemNumbers, 
  legacyOemNumber 
}: OemQuickEditProps) {
  const [open, setOpen] = useState(false);
  const [oemNumbers, setOemNumbers] = useState<OemNumber[]>(initialOemNumbers);
  const [newOem, setNewOem] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

  // Refresh OEM numbers when dialog opens
  useEffect(() => {
    if (open) {
      fetchOemNumbers();
    }
  }, [open]);

  const fetchOemNumbers = async () => {
    setFetchingData(true);
    try {
      const response = await axios.get(`/api/products/${productId}/oem-numbers`);
      setOemNumbers(response.data);
    } catch (error) {
      console.error('Error fetching OEM numbers:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleAddOem = async () => {
    const trimmed = newOem.trim();
    if (!trimmed) {
      toast.error('Unesite OEM broj');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/api/products/${productId}/oem-numbers`, {
        oemNumber: trimmed,
        manufacturer: newManufacturer.trim() || null,
      });
      setOemNumbers(prev => [response.data, ...prev]);
      setNewOem('');
      setNewManufacturer('');
      toast.success('OEM broj dodan');
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error('OEM broj već postoji');
      } else {
        toast.error('Greška pri dodavanju OEM broja');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOem = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/products/${productId}/oem-numbers?id=${id}`);
      setOemNumbers(prev => prev.filter(oem => oem.id !== id));
      toast.success('OEM broj obrisan');
    } catch (error) {
      toast.error('Greška pri brisanju OEM broja');
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleAddOem();
    }
  };

  // Display value for the cell
  const displayValue = oemNumbers.length > 0 
    ? oemNumbers[0].oemNumber 
    : legacyOemNumber || null;

  const totalCount = oemNumbers.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="flex items-center gap-1.5 group text-left hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 transition-colors"
          title="Klikni za brzi edit OEM brojeva"
        >
          {displayValue ? (
            <>
              <span className="text-gray-900 text-sm font-mono truncate max-w-[100px]">
                {displayValue}
              </span>
              {totalCount > 1 && (
                <span className="text-xs text-white bg-blue-500 px-1.5 py-0.5 rounded-full font-medium">
                  +{totalCount - 1}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-400 text-sm">—</span>
          )}
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            OEM brojevi
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1" title={productName}>
            {productName.length > 60 ? productName.substring(0, 60) + '...' : productName}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new OEM - Card style */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Dodaj novi OEM broj
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="oem-number" className="text-xs text-gray-600 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  OEM broj *
                </Label>
                <Input
                  id="oem-number"
                  placeholder="npr. 1K0615301M"
                  value={newOem}
                  onChange={(e) => setNewOem(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manufacturer" className="text-xs text-gray-600 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Proizvođač
                </Label>
                <Input
                  id="manufacturer"
                  placeholder="npr. VAG, Bosch, TRW..."
                  value={newManufacturer}
                  onChange={(e) => setNewManufacturer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button 
                onClick={handleAddOem} 
                disabled={loading || !newOem.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Dodaj OEM
              </Button>
            </div>
          </div>

          {/* List of OEM numbers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Postojeći OEM brojevi
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {totalCount} {totalCount === 1 ? 'broj' : 'brojeva'}
              </span>
            </div>
            
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {fetchingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : oemNumbers.length === 0 && !legacyOemNumber ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Hash className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nema OEM brojeva</p>
                  <p className="text-xs text-gray-400 mt-1">Dodajte prvi OEM broj iznad</p>
                </div>
              ) : (
                <>
                  {oemNumbers.map((oem, index) => (
                    <div 
                      key={oem.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs text-gray-400 font-medium w-6">
                          #{index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono font-medium text-gray-900 block">
                            {oem.oemNumber}
                          </span>
                          {oem.manufacturer && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3" />
                              {oem.manufacturer}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDeleteOem(oem.id)}
                        disabled={deletingId === oem.id}
                        title="Obriši OEM broj"
                      >
                        {deletingId === oem.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  
                  {/* Show legacy OEM number if exists and no articleOENumbers */}
                  {legacyOemNumber && oemNumbers.length === 0 && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xs text-amber-600 font-medium w-6">
                          #1
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono font-medium text-gray-900 block">
                            {legacyOemNumber}
                          </span>
                          <span className="text-xs text-amber-600 mt-0.5 block">
                            Legacy zapis (stari format)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-400 text-center">
            Pritisnite <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">Enter</kbd> za brzo dodavanje
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
