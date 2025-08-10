export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  contactPerson: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
