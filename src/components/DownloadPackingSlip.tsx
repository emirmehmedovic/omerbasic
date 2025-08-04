'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface DownloadPackingSlipProps {
  orderId: string;
}

export default function DownloadPackingSlip({ orderId }: DownloadPackingSlipProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Priprema za preuzimanje...');

    try {
      const response = await fetch(`/api/orders/${orderId}/packing-slip`);

      if (!response.ok) {
        throw new Error('Preuzimanje nije uspjelo.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `otpremnica_${orderId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Otpremnica je uspješno preuzeta!', { id: toastId });
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
      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
    >
      {isDownloading ? 'Preuzimanje...' : 'Preuzmi otpremnicu'}
    </button>
  );
}
