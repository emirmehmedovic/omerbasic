/**
 * Telegram Message Templates
 *
 * Formatirani templejti za različite tipove notifikacija
 */

import { Order, OrderItem, Product, User, OrderStatus } from '@/generated/prisma/client';

type OrderWithDetails = Order & {
  items: (OrderItem & {
    product: Product & {
      manufacturer?: { name: string } | null;
      category?: { name: string } | null;
    };
  })[];
  user?: User | null;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://omerbasic.ba';

/**
 * Formatira cijenu u KM
 */
function formatPrice(price: number): string {
  return `${price.toFixed(2)} KM`;
}

/**
 * Formatira datum
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Template za novu narudžbinu
 */
export function newOrderMessage(order: OrderWithDetails): string {
  const isB2B = order.isB2BOrder;
  const discount = order.discountPercentage || 0;
  const orderShortId = order.id.substring(0, 8);

  // Detalji naručioca
  const customerName = escapeHtml(order.customerName);
  const customerEmail = escapeHtml(order.customerEmail);
  const customerPhone = escapeHtml(
    (order.shippingAddress as any)?.phone || 'N/A'
  );

  // Shipping address
  const address = order.shippingAddress as any;
  const shippingAddress = address
    ? `${escapeHtml(address.street)}\n${escapeHtml(address.postalCode)} ${escapeHtml(address.city)}, ${escapeHtml(address.country || 'BiH')}`
    : 'N/A';

  // Shipping method
  const shippingMethodLabel =
    order.shippingMethod === 'COURIER'
      ? 'Kurirska služba 🚚'
      : 'Lično preuzimanje 🏪';

  // Payment method
  let paymentMethodLabel = 'N/A';
  if (order.paymentMethod === 'CASH_ON_DELIVERY') {
    paymentMethodLabel = 'Pouzećem 💵';
  } else if (order.paymentMethod === 'BANK_TRANSFER') {
    paymentMethodLabel = 'Virman 🏦';
  } else if (order.paymentMethod === 'CARD') {
    paymentMethodLabel = 'Kartica 💳';
  }

  // Proizvodi
  let productsText = '';
  order.items.forEach((item, index) => {
    const product = item.product;
    const productName = escapeHtml(product.name);
    const sku = escapeHtml(product.sku) || 'N/A';
    const catalogNumber = escapeHtml(product.catalogNumber);
    const oemNumber = escapeHtml(product.oemNumber) || 'N/A';
    const manufacturer = escapeHtml(product.manufacturer?.name) || '';

    const originalPrice = item.originalPrice || item.price;
    const finalPrice = item.price;
    const itemTotal = finalPrice * item.quantity;

    let priceDisplay = formatPrice(finalPrice);
    if (isB2B && originalPrice > finalPrice) {
      priceDisplay = `${formatPrice(originalPrice)} → ${formatPrice(finalPrice)} (-${discount}%)`;
    }

    const productLink = `${APP_URL}/products/${product.slug || product.id}`;

    productsText += `\n${index + 1}️⃣ <b>${productName}</b>${manufacturer ? ` (${manufacturer})` : ''}`;
    productsText += `\n   Količina: <b>${item.quantity}x</b>`;
    productsText += `\n   SKU: <code>${sku}</code>`;
    productsText += `\n   Katalog: <code>${catalogNumber}</code>`;
    productsText += `\n   OEM: <code>${oemNumber}</code>`;
    productsText += `\n   Cijena: ${priceDisplay}`;
    productsText += `\n   Subtotal: <b>${formatPrice(itemTotal)}</b>`;
    productsText += `\n   🔗 <a href="${productLink}">Link</a>\n`;
  });

  const orderLink = `${APP_URL}/admin/orders/${order.id}`;

  return `🛒 <b>NOVA NARUDŽBINA #${orderShortId}</b>

━━━━━━━━━━━━━━━━━━━━━━
👤 <b>NARUČILAC</b>
━━━━━━━━━━━━━━━━━━━━━━
Ime: ${customerName}
Email: ${customerEmail}
Telefon: ${customerPhone}
${isB2B ? `Tip: <b>B2B (${discount}% popust)</b> 💼` : 'Tip: <b>Retail</b> 🛍️'}

━━━━━━━━━━━━━━━━━━━━━━
📦 <b>PROIZVODI (${order.items.length} ${order.items.length === 1 ? 'stavka' : 'stavke'})</b>
━━━━━━━━━━━━━━━━━━━━━━
${productsText}
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>FINANSIJE</b>
━━━━━━━━━━━━━━━━━━━━━━
Proizvodi: ${formatPrice(order.subtotal)}
Dostava: ${formatPrice(order.shippingCost)} (${shippingMethodLabel})
━━━━━━━━━━━━━━━━━━━━━━
<b>UKUPNO: ${formatPrice(order.total)}</b> 💵
━━━━━━━━━━━━━━━━━━━━━━
Plaćanje: ${paymentMethodLabel}

📍 <b>ADRESA DOSTAVE:</b>
${shippingAddress}

🕐 Kreirano: ${formatDate(order.createdAt)}

🔗 <a href="${orderLink}">Pregled narudžbine</a>`;
}

/**
 * Template za promjenu statusa narudžbine
 */
export function statusUpdateMessage(
  order: Order,
  oldStatus: OrderStatus,
  newStatus: OrderStatus
): string {
  const orderShortId = order.id.substring(0, 8);
  const customerName = escapeHtml(order.customerName);

  const statusLabels: Record<OrderStatus, string> = {
    PENDING: 'Na čekanju ⏳',
    PROCESSING: 'U obradi 🔄',
    SHIPPED: 'Otpremljeno 📦',
    DELIVERED: 'Isporučeno ✅',
    CANCELLED: 'Otkazano ❌',
  };

  const statusEmojis: Record<OrderStatus, string> = {
    PENDING: '⏳',
    PROCESSING: '🔄',
    SHIPPED: '📦',
    DELIVERED: '✅',
    CANCELLED: '❌',
  };

  const orderLink = `${APP_URL}/admin/orders/${order.id}`;

  return `${statusEmojis[newStatus]} <b>STATUS PROMJENA</b> - Narudžbina #${orderShortId}

Status: ${statusLabels[oldStatus]} → <b>${statusLabels[newStatus]}</b>

👤 Korisnik: ${customerName}
💰 Iznos: ${formatPrice(order.total)}

🔗 <a href="${orderLink}">Detalji narudžbine</a>`;
}

/**
 * Template za low stock upozorenje
 */
export function lowStockMessage(product: Product): string {
  const productName = escapeHtml(product.name);
  const sku = escapeHtml(product.sku) || 'N/A';
  const catalogNumber = escapeHtml(product.catalogNumber);
  const oemNumber = escapeHtml(product.oemNumber) || 'N/A';

  const currentStock = product.stock;
  const threshold = product.lowStockThreshold || 5;
  const recommendedOrder = Math.max(threshold * 4, 20); // Preporučeno 4x threshold ili min 20

  const productLink = `${APP_URL}/admin/products/${product.id}`;

  let marginInfo = '';
  if (product.purchasePrice && product.price) {
    const margin = product.price - product.purchasePrice;
    const marginPercentage = ((margin / product.price) * 100).toFixed(1);
    marginInfo = `
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>FINANSIJE</b>
━━━━━━━━━━━━━━━━━━━━━━
Nabavna cijena: ${formatPrice(product.purchasePrice)}
Prodajna cijena: ${formatPrice(product.price)}
Marža: ${formatPrice(margin)} (${marginPercentage}%)`;
  }

  return `⚠️ <b>LOW STOCK UPOZORENJE</b>

━━━━━━━━━━━━━━━━━━━━━━
📦 <b>PROIZVOD</b>
━━━━━━━━━━━━━━━━━━━━━━
Naziv: ${productName}
SKU: <code>${sku}</code>
Katalog: <code>${catalogNumber}</code>
OEM: <code>${oemNumber}</code>

━━━━━━━━━━━━━━━━━━━━━━
📊 <b>STANJE ZALIHA</b>
━━━━━━━━━━━━━━━━━━━━━━
Trenutno: <b>${currentStock} kom</b> ⚠️
Prag: ${threshold} kom
Preporučeno: Naručiti min. ${recommendedOrder} kom
${marginInfo}

🔗 <a href="${productLink}">Uredi proizvod</a>`;
}

/**
 * Template za dnevni izvještaj
 */
export interface DailyStats {
  date: Date;
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  b2bRevenue: number;
  retailRevenue: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    sku?: string;
  }>;
}

export function dailyReportMessage(stats: DailyStats): string {
  const dateStr = new Intl.DateTimeFormat('bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(stats.date);

  const b2bPercentage = stats.totalRevenue > 0
    ? ((stats.b2bRevenue / stats.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const retailPercentage = stats.totalRevenue > 0
    ? ((stats.retailRevenue / stats.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const statusLabels: Record<OrderStatus, string> = {
    PENDING: 'Na čekanju',
    PROCESSING: 'U obradi',
    SHIPPED: 'Otpremljeno',
    DELIVERED: 'Isporučeno',
    CANCELLED: 'Otkazano',
  };

  let topProductsText = '';
  stats.topProducts.forEach((product, index) => {
    const productName = escapeHtml(product.name);
    const sku = product.sku ? ` (${escapeHtml(product.sku)})` : '';
    topProductsText += `  ${index + 1}. ${productName}${sku} - <b>${product.quantity}x</b>\n`;
  });

  const statsLink = `${APP_URL}/admin/statistics`;

  return `📊 <b>DNEVNI IZVJEŠTAJ</b> - ${dateStr}

━━━━━━━━━━━━━━━━━━━━━━
📦 <b>NARUDŽBINE</b>
━━━━━━━━━━━━━━━━━━━━━━
Ukupno: <b>${stats.totalOrders}</b> narudžbi
  • ${statusLabels.PENDING}: ${stats.ordersByStatus.PENDING || 0}
  • ${statusLabels.PROCESSING}: ${stats.ordersByStatus.PROCESSING || 0}
  • ${statusLabels.SHIPPED}: ${stats.ordersByStatus.SHIPPED || 0}
  • ${statusLabels.DELIVERED}: ${stats.ordersByStatus.DELIVERED || 0}
  • ${statusLabels.CANCELLED}: ${stats.ordersByStatus.CANCELLED || 0}

━━━━━━━━━━━━━━━━━━━━━━
💰 <b>PRIHOD</b>
━━━━━━━━━━━━━━━━━━━━━━
Ukupno: <b>${formatPrice(stats.totalRevenue)}</b>
  • B2B: ${formatPrice(stats.b2bRevenue)} (${b2bPercentage}%)
  • Retail: ${formatPrice(stats.retailRevenue)} (${retailPercentage}%)

━━━━━━━━━━━━━━━━━━━━━━
🏆 <b>TOP PROIZVODI</b>
━━━━━━━━━━━━━━━━━━━━━━
${topProductsText || '  Nema podataka'}

🔗 <a href="${statsLink}">Detaljni izvještaj</a>`;
}
