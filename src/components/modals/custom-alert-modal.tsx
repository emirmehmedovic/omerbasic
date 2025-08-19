"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = "Jeste li sigurni?",
  description = "Ova akcija se ne može poništiti.",
  confirmText = "Potvrdi",
  cancelText = "Odustani",
  children,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-white via-gray-50/95 to-blue-50/60 backdrop-blur-sm border border-amber/20 shadow-xl rounded-2xl max-w-md">
        <DialogHeader className="bg-gradient-to-r from-amber/5 to-orange/5 border-b border-amber/20 rounded-t-2xl -m-6 mb-4 p-6">
          <DialogTitle className="text-gray-900 font-semibold text-lg">{title}</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">{description}</DialogDescription>
        </DialogHeader>
        
        {children && (
          <div className="py-2">
            {children}
          </div>
        )}
        
        <DialogFooter className="bg-gradient-to-r from-gray-50/50 to-amber/5 border-t border-amber/20 rounded-b-2xl -m-6 mt-4 p-6">
          <div className="flex items-center justify-end w-full gap-3">
            <Button
              disabled={loading}
              variant="outline"
              onClick={onClose}
              className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-700 hover:from-white hover:to-gray-50 border-amber/30 hover:border-amber/50 rounded-lg transition-all duration-200 shadow-sm"
            >
              {cancelText}
            </Button>
            <Button
              disabled={loading}
              onClick={onConfirm}
              className="bg-gradient-to-r from-amber via-orange to-brown text-white hover:from-amber/90 hover:via-orange/90 hover:to-brown/90 shadow-lg hover:scale-105 transition-all duration-200 rounded-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Učitavanje...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
