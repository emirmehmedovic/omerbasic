'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
  created: string[];
  updated: string[];
};

export default function ImportProductsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Molimo odaberite CSV datoteku');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Datoteka mora biti CSV format');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Greška prilikom importa');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepoznata greška');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link 
          href="/admin/products" 
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Natrag na proizvode
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Import proizvoda (CSV)</h1>
        <Link 
          href="/api/products/export" 
          target="_blank"
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          <Download className="mr-2 h-4 w-4" />
          Preuzmi predložak
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload CSV datoteke</CardTitle>
            <CardDescription>
              Odaberite CSV datoteku s proizvodima za import. 
              Format datoteke mora odgovarati specifikaciji.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Greška</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={!file || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Učitavanje...
                  </>
                ) : 'Importiraj proizvode'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upute</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>CSV datoteka mora sadržavati sljedeća zaglavlja:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>name (obavezno)</li>
              <li>price (obavezno)</li>
              <li>catalogNumber (obavezno, jedinstveno)</li>
              <li>categoryId (obavezno)</li>
              <li>description</li>
              <li>imageUrl</li>
              <li>stock</li>
              <li>oemNumber</li>
              <li>isFeatured</li>
              <li>isArchived</li>
              <li>technicalSpecs (JSON)</li>
              <li>dimensions (JSON)</li>
              <li>standards (lista)</li>
              <li>vehicleFitments (JSON)</li>
              <li>attributeValues (JSON)</li>
              <li>crossReferences (JSON)</li>
            </ul>
            <p className="mt-4">
              <Link 
                href="/docs/csv-format-specification.md" 
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                Detaljne upute i specifikacija formata
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
              Import završen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 p-4 rounded-md">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-sm text-gray-600">Ukupno redova</div>
              </div>
              <div className="bg-green-100 p-4 rounded-md">
                <div className="text-2xl font-bold text-green-700">{result.success}</div>
                <div className="text-sm text-green-700">Uspješno</div>
              </div>
              <div className="bg-red-100 p-4 rounded-md">
                <div className="text-2xl font-bold text-red-700">{result.failed}</div>
                <div className="text-sm text-red-700">Neuspješno</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.created.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Kreirani proizvodi ({result.created.length})</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md">
                    <ul className="list-disc pl-5 space-y-1">
                      {result.created.map((catalogNumber, index) => (
                        <li key={index} className="text-sm">{catalogNumber}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.updated.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Ažurirani proizvodi ({result.updated.length})</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md">
                    <ul className="list-disc pl-5 space-y-1">
                      {result.updated.map((catalogNumber, index) => (
                        <li key={index} className="text-sm">{catalogNumber}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Greške ({result.errors.length})</h3>
                <div className="max-h-60 overflow-y-auto bg-red-50 p-3 rounded-md">
                  <ul className="list-disc pl-5 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-sm">
                        <span className="font-medium">Red {error.row}:</span> {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/products')}
              className="mr-2"
            >
              Natrag na proizvode
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
            >
              Novi import
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
