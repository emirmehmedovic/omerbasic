import VehicleCompatibilityClient from "./_components/VehicleCompatibilityClient";

export const metadata = {
  title: "Pretraga proizvoda po vozilu | Omerbasic",
  description: "Pronađite dijelove koji odgovaraju vašem vozilu",
};

export default function VehicleCompatibilityPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Pretraga proizvoda po vozilu</h1>
      <VehicleCompatibilityClient />
    </div>
  );
}
