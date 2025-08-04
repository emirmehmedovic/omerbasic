'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface DownloadInvoiceProps {
  orderId: string;
}

export default function DownloadInvoice({ orderId }: DownloadInvoiceProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Priprema fakture za preuzimanje...');

    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);

      if (!response.ok) {
        throw new Error('Preuzimanje fakture nije uspjelo.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura_${orderId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Faktura je uspješno preuzeta!', { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Došlo je do greške.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
    >
      {isDownloading ? 'Preuzimanje...' : 'Preuzmi fakturu'}
    </button>
  );
}
