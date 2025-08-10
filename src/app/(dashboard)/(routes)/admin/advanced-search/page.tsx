import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import AdvancedSearchTester from "@/components/admin/AdvancedSearchTester";

export default function AdvancedSearchPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Napredna pretraga"
          description="Testirajte funkcionalnost napredne pretrage proizvoda"
        />
        <Separator />
        <AdvancedSearchTester />
      </div>
    </div>
  );
}
