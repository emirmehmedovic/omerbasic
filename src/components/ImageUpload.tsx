'use client';

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ImagePlus, Trash } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, disabled }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onChange(response.data.url);
      toast.success('Slika uspješno učitana.');
    } catch (error) {
      toast.error('Došlo je do greške prilikom uploada slike.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const onRemove = () => {
    onChange('');
  };

  return (
    <div>
      {value ? (
        <div className="relative h-52 w-52 rounded-md overflow-hidden">
            <div className="absolute top-2 right-2 z-10">
                <button type="button" onClick={onRemove} className="p-1.5 bg-red-600 text-white rounded-full shadow-sm hover:bg-red-700">
                    <Trash className="h-4 w-4" />
                </button>
            </div>
          <Image fill className="object-cover" alt="Učitana slika" src={value} />
        </div>
      ) : (
        <label className="relative flex flex-col items-center justify-center w-52 h-52 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-indigo-500 transition-colors">
          <div className="text-center">
            <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">{isUploading ? 'Učitavanje...' : 'Odaberi sliku'}</p>
          </div>
          <input 
            type="file"
            onChange={handleUpload}
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || isUploading}
          />
        </label>
      )}
    </div>
  );
};
