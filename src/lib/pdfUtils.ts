import { jsPDF } from "jspdf";
import { format } from "date-fns";

// Napomena: Ne koristimo jspdf-autotable zbog problema s importom u Next.js

// Interface for purchase order data
interface PurchaseOrderPdfData {
  id: string;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  deliveryDate: string | null;
  status: string;
  notes: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  supplier: {
    name: string;
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  };
  items: {
    id: string;
    productId: string;
    quantity: number;
    receivedQty: number;
    unitPrice: number;
    totalPrice: number;
    product: {
      name: string;
      catalogNumber: string;
    };
  }[];
  createdBy: {
    name: string;
    email: string;
  };
}

/**
 * Generate a PDF delivery note for a purchase order
 * @param purchaseOrder Purchase order data
 * @returns Blob of the generated PDF
 */
export const generatePurchaseOrderPdf = (purchaseOrder: PurchaseOrderPdfData): Blob => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `Dostavnica ${purchaseOrder.orderNumber}`,
    subject: `Dostavnica za narudžbenicu ${purchaseOrder.orderNumber}`,
    author: "OmerBasic Auto Dijelovi",
    creator: "OmerBasic Auto Dijelovi",
  });
  
  // Add company logo and header
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("OmerBasic Auto Dijelovi", 105, 20, { align: "center" });
  
  doc.setFontSize(16);
  doc.text("DOSTAVNICA", 105, 30, { align: "center" });
  
  // Add purchase order details
  doc.setFontSize(10);
  doc.text(`Broj narudžbe: ${purchaseOrder.orderNumber}`, 14, 40);
  doc.text(`Datum: ${format(new Date(purchaseOrder.orderDate), "dd.MM.yyyy")}`, 14, 45);
  
  if (purchaseOrder.expectedDeliveryDate) {
    doc.text(`Očekivana isporuka: ${format(new Date(purchaseOrder.expectedDeliveryDate), "dd.MM.yyyy")}`, 14, 50);
  }
  
  // Add supplier information
  doc.setFontSize(12);
  doc.text("Dobavljač:", 14, 60);
  doc.setFontSize(10);
  doc.text(purchaseOrder.supplier.name, 14, 65);
  
  if (purchaseOrder.supplier.contactPerson) {
    doc.text(`Kontakt: ${purchaseOrder.supplier.contactPerson}`, 14, 70);
  }
  
  if (purchaseOrder.supplier.address) {
    doc.text(purchaseOrder.supplier.address, 14, 75);
  }
  
  if (purchaseOrder.supplier.city && purchaseOrder.supplier.postalCode) {
    doc.text(`${purchaseOrder.supplier.postalCode} ${purchaseOrder.supplier.city}`, 14, 80);
  } else if (purchaseOrder.supplier.city) {
    doc.text(purchaseOrder.supplier.city, 14, 80);
  }
  
  if (purchaseOrder.supplier.phone) {
    doc.text(`Tel: ${purchaseOrder.supplier.phone}`, 14, 85);
  }
  
  if (purchaseOrder.supplier.email) {
    doc.text(`Email: ${purchaseOrder.supplier.email}`, 14, 90);
  }
  
  // Dodaj tablicu stavki - ručna implementacija bez autoTable
  const startY = 100;
  const lineHeight = 10;
  const colWidths = [10, 25, 60, 15, 15, 25, 25];
  const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const startX = (doc.internal.pageSize.width - tableWidth) / 2;
  
  // Zaglavlje tablice
  const tableColumn = ["R.br.", "Šifra", "Naziv proizvoda", "Količina", "Primljeno", "Cijena", "Ukupno"];
  
  // Postavi stil zaglavlja
  doc.setFillColor(22, 22, 22);
  doc.setTextColor(255, 255, 255);
  doc.rect(startX, startY, tableWidth, lineHeight, "F");
  
  // Ispiši zaglavlje
  let currentX = startX;
  doc.setFontSize(8);
  tableColumn.forEach((header, i) => {
    const width = colWidths[i];
    doc.text(header, currentX + width / 2, startY + lineHeight / 2, { align: "center" });
    currentX += width;
  });
  
  // Resetiraj stil za tijelo tablice
  doc.setTextColor(0, 0, 0);
  
  // Ispiši redove tablice
  let currentY = startY + lineHeight;
  let isEvenRow = false;
  
  purchaseOrder.items.forEach((item, index) => {
    // Alternativne boje redova
    if (isEvenRow) {
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, currentY, tableWidth, lineHeight, "F");
    }
    isEvenRow = !isEvenRow;
    
    // Ispiši podatke reda
    currentX = startX;
    
    // R.br.
    doc.text(String(index + 1), currentX + colWidths[0] / 2, currentY + lineHeight / 2, { align: "center" });
    currentX += colWidths[0];
    
    // Šifra
    doc.text(item.product.catalogNumber, currentX + 2, currentY + lineHeight / 2);
    currentX += colWidths[1];
    
    // Naziv proizvoda
    doc.text(item.product.name, currentX + 2, currentY + lineHeight / 2);
    currentX += colWidths[2];
    
    // Količina
    doc.text(String(item.quantity), currentX + colWidths[3] - 2, currentY + lineHeight / 2, { align: "right" });
    currentX += colWidths[3];
    
    // Primljeno
    doc.text(String(item.receivedQty), currentX + colWidths[4] - 2, currentY + lineHeight / 2, { align: "right" });
    currentX += colWidths[4];
    
    // Cijena
    doc.text(`${item.unitPrice.toFixed(2)} KM`, currentX + colWidths[5] - 2, currentY + lineHeight / 2, { align: "right" });
    currentX += colWidths[5];
    
    // Ukupno
    doc.text(`${item.totalPrice.toFixed(2)} KM`, currentX + colWidths[6] - 2, currentY + lineHeight / 2, { align: "right" });
    
    currentY += lineHeight;
  });
  
  // Dodaj ukupne iznose
  const finalY = currentY + 10;
  
  doc.setFontSize(10);
  doc.text(`Iznos bez PDV-a: ${purchaseOrder.subtotal.toFixed(2)} KM`, 170, finalY + 10, { align: "right" });
  doc.text(`PDV (17%): ${purchaseOrder.taxAmount.toFixed(2)} KM`, 170, finalY + 15, { align: "right" });
  doc.text(`Ukupno: ${purchaseOrder.totalAmount.toFixed(2)} KM`, 170, finalY + 20, { align: "right" });
  
  // Add notes if available
  if (purchaseOrder.notes) {
    doc.setFontSize(10);
    doc.text("Napomena:", 14, finalY + 30);
    doc.text(purchaseOrder.notes, 14, finalY + 35);
  }
  
  // Add signature fields
  doc.setFontSize(10);
  doc.text("Dostavnica kreirana:", 14, finalY + 50);
  doc.text(format(new Date(), "dd.MM.yyyy HH:mm"), 14, finalY + 55);
  doc.text(`Kreirao: ${purchaseOrder.createdBy.name}`, 14, finalY + 60);
  
  doc.text("Potpis i pečat:", 140, finalY + 50);
  doc.line(140, finalY + 60, 190, finalY + 60);
  
  // Convert the PDF to a blob
  const pdfBlob = doc.output("blob");
  return pdfBlob;
};

/**
 * Download a PDF file
 * @param blob PDF blob
 * @param filename Filename for the downloaded file
 */
export const downloadPdf = (blob: Blob, filename: string): void => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  
  // Append to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
};
