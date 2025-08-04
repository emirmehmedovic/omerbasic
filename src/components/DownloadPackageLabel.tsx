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
      className="flex items-center justify-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
    >
      <FaPrint />
      <span>Ispis Etikete</span>
    </button>
  );
}
