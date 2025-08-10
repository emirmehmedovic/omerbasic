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
        variant="ghost"
        size="sm"
        onClick={(e) => e.stopPropagation()}
      >
        <Settings className="h-4 w-4" />
        <span className="ml-2">Motori</span>
      </Button>
    </Link>
  );
};
