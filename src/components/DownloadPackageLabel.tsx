'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaPrint } from 'react-icons/fa';

interface DownloadPackageLabelProps {
  orderId: string;
}

export default function DownloadPackageLabel({ orderId }: DownloadPackageLabelProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    toast.loading('Priprema za ispis etikete...');

    try {
      const response = await fetch(`/api/orders/${orderId}/package-label`);

      if (!response.ok) {
        throw new Error('Preuzimanje nije uspjelo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Etiketa je uspješno preuzeta!');

    } catch (error) {
      console.error('Greška prilikom preuzimanja etikete:', error);
      toast.dismiss();
      toast.error('Nije uspjelo preuzimanje etikete.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className="bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      {isLoading ? 'Preuzimanje...' : 'Ispis Etikete'}
    </button>
  );
}
