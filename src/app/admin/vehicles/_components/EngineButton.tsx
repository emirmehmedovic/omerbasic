"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface EngineButtonProps {
  generationId: string;
}

export const EngineButton = ({ generationId }: EngineButtonProps) => {
  return (
    <Link href={`/admin/vehicles/engines/${generationId}`} className="ml-2">
      <Button
        size="sm"
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-3 py-1 text-xs font-medium"
      >
        <Settings className="h-4 w-4 mr-1" />
        Motori
      </Button>
    </Link>
  );
};
