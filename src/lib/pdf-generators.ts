import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    sku?: string | null;
    oemNumber?: string | null;
  };
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: any;
  billingAddress?: any;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export async function generateInvoicePDF(order: Order): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Noto Sans fonts
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const fontBoldBytes = fs.readFileSync(fontBoldPath);

  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  let yPosition = height - 40;

  // Try to load company logo
  let logoImage;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-tp-omerbasic.png');
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    // Logo not found, will use text fallback
  }

  // Header with logo or company name
  if (logoImage) {
    const logoDims = logoImage.scale(0.25); // Larger logo for better visibility
    page.drawImage(logoImage, {
      x: 50,
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    yPosition -= logoDims.height + 15;
  } else {
    page.drawText('TP OMERBAŠIĆ d.o.o.', {
      x: 50,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0.85, 0.33, 0),
    });
    yPosition -= 25;
  }

  // Document title - FAKTURA
  page.drawText('FAKTURA', {
    x: width - 150,
    y: height - 50,
    size: 22,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Draw separator line
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 2,
    color: rgb(0.85, 0.33, 0),
  });
  yPosition -= 25;

  // Company info in smaller text
  const companyInfoX = 50;
  page.drawText('TP OMERBAŠIĆ d.o.o.', {
    x: companyInfoX,
    y: yPosition,
    size: 9,
    font: fontBold,
  });
  yPosition -= 12;
  page.drawText('Braće Omerbašića 65, 74264 Jelah – Tešanj, BiH', {
    x: companyInfoX,
    y: yPosition,
    size: 8,
    font,
  });
  yPosition -= 11;
  page.drawText('JIB: 4218467320009 | MBS: 43-01-0150-10', {
    x: companyInfoX,
    y: yPosition,
    size: 8,
    font,
  });
  yPosition -= 11;
  page.drawText('Tel: +387 32 666 658 | Email: tehcnicalservices@gmail.com', {
    x: companyInfoX,
    y: yPosition,
    size: 8,
    font,
  });

  yPosition -= 40;

  // Customer info
  page.drawText('Kupac', {
    x: 50,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  yPosition -= 20;
  page.drawText(order.customerName, {
    x: 50,
    y: yPosition,
    size: 10,
    font,
  });
  yPosition -= 15;
  if (order.billingAddress?.street) {
    page.drawText(order.billingAddress.street, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
    });
    yPosition -= 15;
  }
  if (order.billingAddress?.city) {
    page.drawText(`${order.billingAddress.city}, ${order.billingAddress.postalCode}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
    });
    yPosition -= 15;
  }

  // Invoice number and date - right aligned box
  const invoiceInfoX = width - 200;
  let invoiceY = height - 130;

  // Draw background box for invoice info
  page.drawRectangle({
    x: invoiceInfoX - 10,
    y: invoiceY - 45,
    width: 190,
    height: 55,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('Broj fakture:', {
    x: invoiceInfoX,
    y: invoiceY,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  invoiceY -= 12;
  page.drawText(`FAK-${order.id.substring(0, 8).toUpperCase()}`, {
    x: invoiceInfoX,
    y: invoiceY,
    size: 10,
    font: fontBold,
  });
  invoiceY -= 18;
  page.drawText('Datum izdavanja:', {
    x: invoiceInfoX,
    y: invoiceY,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  invoiceY -= 12;
  page.drawText(new Date(order.createdAt).toLocaleDateString('bs-BA'), {
    x: invoiceInfoX,
    y: invoiceY,
    size: 10,
    font: fontBold,
  });

  yPosition -= 40;

  // Items table
  page.drawText('Stavke narudžbe', {
    x: 50,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  yPosition -= 25;

  // Table header with background
  const tableStartY = yPosition;
  const tableHeaderHeight = 20;

  // Draw header background
  page.drawRectangle({
    x: 50,
    y: yPosition - tableHeaderHeight + 5,
    width: width - 100,
    height: tableHeaderHeight,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Table headers - white text on dark background
  page.drawText('R.br.', { x: 55, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Naziv proizvoda', { x: 90, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Količina', { x: 340, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Cijena (BAM)', { x: 400, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Ukupno (BAM)', { x: 480, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  yPosition -= tableHeaderHeight + 5;

  // Table items with alternating row colors
  order.items.forEach((item, index) => {
    const rowHeight = item.product.sku ? 30 : 20;

    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: yPosition - rowHeight + 5,
        width: width - 100,
        height: rowHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    // Row number
    page.drawText((index + 1).toString(), { x: 60, y: yPosition, size: 9, font });

    // Product name
    let productName = item.product.name;
    if (productName.length > 35) {
      productName = productName.substring(0, 32) + '...';
    }
    page.drawText(productName, { x: 90, y: yPosition, size: 9, font });

    // SKU if available
    if (item.product.sku) {
      yPosition -= 11;
      page.drawText(`SKU: ${item.product.sku}`, { x: 90, y: yPosition, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    }

    // Quantity, Price, Total - right aligned
    const baseY = yPosition + (item.product.sku ? 11 : 0);
    page.drawText(item.quantity.toString(), { x: 355, y: baseY, size: 9, font });
    page.drawText(item.price.toFixed(2), { x: 415, y: baseY, size: 9, font });
    page.drawText((item.price * item.quantity).toFixed(2), { x: 490, y: baseY, size: 9, font });

    yPosition -= rowHeight + 2;

    if (yPosition < 180) return; // Prevent overflow
  });

  yPosition -= 15;

  // Summary section - right aligned box
  const summaryX = width - 240;
  const summaryBoxWidth = 190;

  // Draw separator line before summary
  page.drawLine({
    start: { x: width - 250, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  yPosition -= 15;

  // Subtotal
  page.drawText('Subtotal:', { x: summaryX, y: yPosition, size: 10, font });
  page.drawText(`${order.subtotal.toFixed(2)} BAM`, { x: summaryX + 100, y: yPosition, size: 10, font });
  yPosition -= 15;

  // Shipping
  page.drawText('Dostava:', { x: summaryX, y: yPosition, size: 10, font });
  page.drawText(`${order.shippingCost.toFixed(2)} BAM`, { x: summaryX + 100, y: yPosition, size: 10, font });
  yPosition -= 20;

  // Total with background
  page.drawRectangle({
    x: summaryX - 10,
    y: yPosition - 15,
    width: summaryBoxWidth,
    height: 25,
    color: rgb(0.85, 0.33, 0),
  });

  page.drawText('UKUPNO ZA UPLATU:', { x: summaryX, y: yPosition, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`${order.total.toFixed(2)} BAM`, { x: summaryX + 105, y: yPosition, size: 11, font: fontBold, color: rgb(1, 1, 1) });

  // Footer with bank details
  const footerY = 80;
  page.drawText('Detalji za uplatu:', {
    x: 50,
    y: footerY + 30,
    size: 9,
    font: fontBold,
  });
  page.drawText('Raiffeisen Bank d.d. BiH', { x: 50, y: footerY + 18, size: 8, font });
  page.drawText(`IBAN: BA391615003001510049`, { x: 50, y: footerY + 8, size: 8, font });
  page.drawText(`SWIFT/BIC: RZBABA2SXXX`, { x: 50, y: footerY - 2, size: 8, font });

  // Payment note
  page.drawText('Hvala vam na povjerenju!', {
    x: width / 2 - 60,
    y: 35,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

export async function generatePackingSlipPDF(order: Order): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Noto Sans fonts
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const fontBoldBytes = fs.readFileSync(fontBoldPath);

  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  let yPosition = height - 40;

  // Try to load company logo
  let logoImage;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-tp-omerbasic.png');
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    // Logo not found, will use text fallback
  }

  // Header with logo or company name
  if (logoImage) {
    const logoDims = logoImage.scale(0.25); // Larger logo for better visibility
    page.drawImage(logoImage, {
      x: 50,
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    yPosition -= logoDims.height + 15;
  } else {
    page.drawText('TP OMERBAŠIĆ d.o.o.', {
      x: 50,
      y: yPosition,
      size: 18,
      font: fontBold,
      color: rgb(0.85, 0.33, 0),
    });
    yPosition -= 25;
  }

  // Document title - OTPREMNICA
  page.drawText('OTPREMNICA', {
    x: width - 165,
    y: height - 50,
    size: 22,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Draw separator line
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 2,
    color: rgb(0.85, 0.33, 0),
  });
  yPosition -= 25;

  // Company info in smaller text
  const companyInfoX = 50;
  page.drawText('TP OMERBAŠIĆ d.o.o.', {
    x: companyInfoX,
    y: yPosition,
    size: 9,
    font: fontBold,
  });
  yPosition -= 12;
  page.drawText('Braće Omerbašića 65, 74264 Jelah – Tešanj, BiH', {
    x: companyInfoX,
    y: yPosition,
    size: 8,
    font,
  });
  yPosition -= 11;
  page.drawText('Tel: +387 32 666 658', {
    x: companyInfoX,
    y: yPosition,
    size: 8,
    font,
  });

  // Order info box - right aligned
  const orderInfoX = width - 200;
  let orderY = height - 130;

  page.drawRectangle({
    x: orderInfoX - 10,
    y: orderY - 45,
    width: 190,
    height: 55,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('Broj narudžbe:', {
    x: orderInfoX,
    y: orderY,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  orderY -= 12;
  page.drawText(`OTP-${order.id.substring(0, 8).toUpperCase()}`, {
    x: orderInfoX,
    y: orderY,
    size: 10,
    font: fontBold,
  });
  orderY -= 18;
  page.drawText('Datum:', {
    x: orderInfoX,
    y: orderY,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  orderY -= 12;
  page.drawText(new Date(order.createdAt).toLocaleDateString('bs-BA'), {
    x: orderInfoX,
    y: orderY,
    size: 10,
    font: fontBold,
  });

  yPosition -= 40;

  // Shipping address section
  page.drawText('Adresa za dostavu:', {
    x: 50,
    y: yPosition,
    size: 11,
    font: fontBold,
  });
  yPosition -= 18;

  // Address box
  page.drawRectangle({
    x: 50,
    y: yPosition - 60,
    width: 250,
    height: 70,
    borderColor: rgb(0.85, 0.33, 0),
    borderWidth: 1.5,
  });

  page.drawText(order.customerName, {
    x: 60,
    y: yPosition - 10,
    size: 10,
    font: fontBold,
  });
  yPosition -= 22;

  if (order.shippingAddress?.street) {
    page.drawText(order.shippingAddress.street, {
      x: 60,
      y: yPosition,
      size: 9,
      font,
    });
    yPosition -= 13;
  }
  if (order.shippingAddress?.city) {
    page.drawText(`${order.shippingAddress.city}, ${order.shippingAddress.postalCode}`, {
      x: 60,
      y: yPosition,
      size: 9,
      font,
    });
    yPosition -= 13;
  }
  if (order.shippingAddress?.country) {
    page.drawText(order.shippingAddress.country, {
      x: 60,
      y: yPosition,
      size: 9,
      font,
    });
  }

  yPosition -= 30;

  // Items table
  page.drawText('Sadržaj paketa', {
    x: 50,
    y: yPosition,
    size: 12,
    font: fontBold,
  });
  yPosition -= 25;

  // Table header with background
  const tableHeaderHeight = 20;

  page.drawRectangle({
    x: 50,
    y: yPosition - tableHeaderHeight + 5,
    width: width - 100,
    height: tableHeaderHeight,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Table headers - white text on dark background
  page.drawText('R.br.', { x: 55, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Naziv proizvoda', { x: 90, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Količina', { x: 360, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Cijena (BAM)', { x: 430, y: yPosition - 5, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  yPosition -= tableHeaderHeight + 5;

  // Table items with alternating row colors
  order.items.forEach((item, index) => {
    const hasSku = !!item.product.sku;
    const hasOem = !!item.product.oemNumber;
    const rowHeight = 20 + (hasSku ? 11 : 0) + (hasOem ? 11 : 0);

    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: yPosition - rowHeight + 5,
        width: width - 100,
        height: rowHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    // Row number
    page.drawText((index + 1).toString(), { x: 60, y: yPosition, size: 9, font });

    // Product name
    let productName = item.product.name;
    if (productName.length > 35) {
      productName = productName.substring(0, 32) + '...';
    }
    page.drawText(productName, { x: 90, y: yPosition, size: 9, font });

    // SKU and OEM if available
    let detailOffset = 0;
    if (hasSku) {
      yPosition -= 11;
      detailOffset += 11;
      page.drawText(`SKU: ${item.product.sku}`, { x: 90, y: yPosition, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    }
    if (hasOem) {
      yPosition -= 11;
      detailOffset += 11;
      page.drawText(`OEM: ${item.product.oemNumber}`, { x: 90, y: yPosition, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
    }

    // Quantity and Price - right aligned
    const baseY = yPosition + detailOffset;
    page.drawText(item.quantity.toString(), { x: 375, y: baseY, size: 9, font });
    page.drawText(`${item.price.toFixed(2)}`, { x: 445, y: baseY, size: 9, font });

    yPosition -= rowHeight - detailOffset + 2;

    if (yPosition < 120) return; // Prevent overflow
  });

  // Footer section
  yPosition = 80;

  // Separator line
  page.drawLine({
    start: { x: 50, y: yPosition + 30 },
    end: { x: width - 50, y: yPosition + 30 },
    thickness: 1,
    color: rgb(0.85, 0.33, 0),
  });

  page.drawText('Napomena:', {
    x: 50,
    y: yPosition + 12,
    size: 9,
    font: fontBold,
  });
  page.drawText('Molimo provjerite sadržaj paketa prilikom preuzimanja.', {
    x: 50,
    y: yPosition,
    size: 8,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Thank you message
  page.drawText('Hvala vam na povjerenju!', {
    x: width / 2 - 60,
    y: 35,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

interface PackageLabelOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: any;
  createdAt: string;
}

export async function generatePackageLabelPDF(order: PackageLabelOrder): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load Noto Sans fonts
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const fontBoldBytes = fs.readFileSync(fontBoldPath);

  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  // A6 size label (105mm x 148mm = 297.64 x 419.53 points)
  const page = pdfDoc.addPage([297.64, 419.53]);
  const { width, height } = page.getSize();

  // Try to load company logo
  let logoImage;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-tp-omerbasic.png');
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    // Logo not found
  }

  let yPosition = height - 20;

  // Header with logo (smaller for label)
  if (logoImage) {
    const logoDims = logoImage.scale(0.15);
    page.drawImage(logoImage, {
      x: (width - logoDims.width) / 2, // Center logo
      y: yPosition - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    yPosition -= logoDims.height + 15;
  } else {
    page.drawText('TP OMERBAŠIĆ d.o.o.', {
      x: width / 2 - 50,
      y: yPosition,
      size: 12,
      font: fontBold,
      color: rgb(0.85, 0.33, 0),
    });
    yPosition -= 20;
  }

  // Sender info (compact)
  page.drawText('POŠILJALAC:', {
    x: 15,
    y: yPosition,
    size: 7,
    font: fontBold,
  });
  yPosition -= 10;

  page.drawText('TP OMERBAŠIĆ d.o.o.', {
    x: 15,
    y: yPosition,
    size: 8,
    font,
  });
  yPosition -= 10;

  page.drawText('Braće Omerbašića 65', {
    x: 15,
    y: yPosition,
    size: 7,
    font,
  });
  yPosition -= 9;

  page.drawText('74264 Jelah - Tešanj, BiH', {
    x: 15,
    y: yPosition,
    size: 7,
    font,
  });
  yPosition -= 9;

  page.drawText('Tel: +387 32 666 658', {
    x: 15,
    y: yPosition,
    size: 7,
    font,
  });

  yPosition -= 25;

  // Separator line
  page.drawLine({
    start: { x: 15, y: yPosition },
    end: { x: width - 15, y: yPosition },
    thickness: 1,
    color: rgb(0.85, 0.33, 0),
  });

  yPosition -= 20;

  // Recipient section - larger and prominent
  page.drawText('PRIMALAC:', {
    x: 15,
    y: yPosition,
    size: 9,
    font: fontBold,
  });
  yPosition -= 18;

  // Draw recipient box
  const boxHeight = 110;
  page.drawRectangle({
    x: 15,
    y: yPosition - boxHeight,
    width: width - 30,
    height: boxHeight,
    borderColor: rgb(0.85, 0.33, 0),
    borderWidth: 2,
  });

  yPosition -= 15;

  // Customer name - large and bold
  page.drawText(order.customerName, {
    x: 25,
    y: yPosition,
    size: 14,
    font: fontBold,
  });
  yPosition -= 22;

  // Address details
  if (order.shippingAddress?.street) {
    page.drawText(order.shippingAddress.street, {
      x: 25,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= 18;
  }

  if (order.shippingAddress?.city) {
    const postalCode = order.shippingAddress.postalCode || '';
    const cityLine = `${postalCode} ${order.shippingAddress.city}`;
    page.drawText(cityLine, {
      x: 25,
      y: yPosition,
      size: 11,
      font,
    });
    yPosition -= 18;
  }

  if (order.shippingAddress?.country) {
    page.drawText(order.shippingAddress.country, {
      x: 25,
      y: yPosition,
      size: 10,
      font,
    });
  }

  // Order number at bottom
  yPosition = 50;
  page.drawText(`Narudžba: ${order.id.substring(0, 10).toUpperCase()}`, {
    x: 15,
    y: yPosition,
    size: 8,
    font: fontBold,
  });

  page.drawText(`Datum: ${new Date(order.createdAt).toLocaleDateString('bs-BA')}`, {
    x: width - 85,
    y: yPosition,
    size: 8,
    font,
  });

  // Barcode placeholder (just order ID as text for now)
  yPosition -= 15;
  page.drawText(order.id.toUpperCase(), {
    x: (width - 100) / 2,
    y: yPosition,
    size: 6,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
