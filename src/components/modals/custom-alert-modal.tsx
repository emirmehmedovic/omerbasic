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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {children}
        
        <DialogFooter>
          <div className="flex items-center justify-end w-full gap-2">
            <Button
              disabled={loading}
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            <Button
              disabled={loading}
              onClick={onConfirm}
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
