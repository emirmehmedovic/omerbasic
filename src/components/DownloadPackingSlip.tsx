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
      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:scale-105 transition-all duration-200 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {isDownloading ? 'Preuzimanje...' : 'Preuzmi otpremnicu'}
    </button>
  );
}
