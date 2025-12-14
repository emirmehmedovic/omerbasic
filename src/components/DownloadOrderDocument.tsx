'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

interface DownloadOrderDocumentProps {
  orderId: string;
  documentType: 'invoice' | 'packing-slip';
  buttonText: string;
}

export default function DownloadOrderDocument({ orderId, documentType, buttonText }: DownloadOrderDocumentProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Priprema za preuzimanje...');

    try {
      const response = await fetch(`/api/orders/${orderId}/${documentType}`);

      if (!response.ok) {
        throw new Error('Preuzimanje nije uspjelo.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentType}_${orderId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Dokument je uspješno preuzet!', { id: toastId });
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
      className="flex items-center justify-center gap-2 text-sm px-3 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download size={14} />
      {isDownloading ? 'Preuzimanje...' : buttonText}
    </button>
  );
}
