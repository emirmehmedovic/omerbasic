/**
 * Telegram Notification Service
 *
 * Centraliziran servis za slanje Telegram notifikacija
 */

import { db } from '@/lib/db';
import { TelegramClient } from './telegram-client';
import {
  newOrderMessage,
  statusUpdateMessage,
  lowStockMessage,
  dailyReportMessage,
  type DailyStats,
} from './message-templates';
import type { Order, Product, OrderStatus } from '@/generated/prisma/client';

/**
 * Dohvaća Telegram settings iz baze i kreira klijent
 */
async function getTelegramClientAndSettings(): Promise<{
  client: TelegramClient | null;
  settings: any | null;
}> {
  try {
    // Dohvati settings iz baze
    const settings = await db.telegramSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!settings?.botToken) {
      console.warn('[Telegram] Bot token not configured in database');
      return { client: null, settings: null };
    }

    const client = new TelegramClient(settings.botToken);
    return { client, settings };
  } catch (error) {
    console.error('[Telegram] Failed to get settings:', error);
    return { client: null, settings: null };
  }
}

/**
 * Šalje notifikaciju za novu narudžbinu
 */
export async function sendNewOrderNotification(orderId: string): Promise<void> {
  try {
    const { client, settings } = await getTelegramClientAndSettings();

    if (!client || !settings) {
      console.log('[Telegram] Skipping new order notification - not configured');
      return;
    }

    if (!settings.ordersEnabled || !settings.ordersGroupChatId) {
      console.log('[Telegram] Orders notifications disabled or chat ID not set');
      return;
    }

    // Dohvati punu narudžbinu sa svim podacima
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                manufacturer: {
                  select: { name: true },
                },
                category: {
                  select: { name: true },
                },
              },
            },
          },
        },
        user: true,
      },
    });

    if (!order) {
      console.error('[Telegram] Order not found:', orderId);
      return;
    }

    const message = newOrderMessage(order);

    await client.sendMessage(settings.ordersGroupChatId, message, {
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });

    console.log('[Telegram] New order notification sent successfully');
  } catch (error) {
    console.error('[Telegram] Failed to send new order notification:', error);
    // Ne bacamo error da ne zaustavimo kreiranje narudžbine
  }
}

/**
 * Šalje notifikaciju za promjenu statusa narudžbine
 */
export async function sendStatusUpdateNotification(
  orderId: string,
  oldStatus: OrderStatus,
  newStatus: OrderStatus
): Promise<void> {
  try {
    const { client, settings } = await getTelegramClientAndSettings();

    if (!client || !settings) {
      console.log('[Telegram] Skipping status update notification - not configured');
      return;
    }

    if (!settings.ordersEnabled || !settings.ordersGroupChatId) {
      console.log('[Telegram] Orders notifications disabled or chat ID not set');
      return;
    }

    // Dohvati narudžbinu
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      console.error('[Telegram] Order not found:', orderId);
      return;
    }

    const message = statusUpdateMessage(order, oldStatus, newStatus);

    await client.sendMessage(settings.ordersGroupChatId, message, {
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });

    console.log('[Telegram] Status update notification sent successfully');
  } catch (error) {
    console.error('[Telegram] Failed to send status update notification:', error);
    // Ne bacamo error da ne zaustavimo update narudžbine
  }
}

/**
 * Šalje notifikaciju za low stock
 */
export async function sendLowStockNotification(productId: string): Promise<void> {
  try {
    const { client, settings } = await getTelegramClientAndSettings();

    if (!client || !settings) {
      console.log('[Telegram] Skipping low stock notification - not configured');
      return;
    }

    if (!settings.lowStockEnabled || !settings.lowStockGroupChatId) {
      console.log('[Telegram] Low stock notifications disabled or chat ID not set');
      return;
    }

    // Dohvati proizvod
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      console.error('[Telegram] Product not found:', productId);
      return;
    }

    // Provjeri da li je već poslato upozorenje
    if (product.lowStockAlerted) {
      console.log('[Telegram] Low stock alert already sent for product:', productId);
      return;
    }

    // Provjeri da li je stock ispod thresholda
    const threshold = product.lowStockThreshold || 5;
    if (product.stock >= threshold) {
      console.log('[Telegram] Product stock above threshold, skipping alert');
      return;
    }

    const message = lowStockMessage(product);

    await client.sendMessage(settings.lowStockGroupChatId, message, {
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });

    // Označi da je upozorenje poslato
    await db.product.update({
      where: { id: productId },
      data: { lowStockAlerted: true },
    });

    console.log('[Telegram] Low stock notification sent successfully');
  } catch (error) {
    console.error('[Telegram] Failed to send low stock notification:', error);
    // Ne bacamo error
  }
}

/**
 * Šalje dnevni izvještaj
 */
export async function sendDailyReport(date?: Date): Promise<void> {
  try {
    const { client, settings } = await getTelegramClientAndSettings();

    if (!client || !settings) {
      console.log('[Telegram] Skipping daily report - not configured');
      return;
    }

    if (!settings.dailyReportEnabled) {
      console.log('[Telegram] Daily reports disabled');
      return;
    }

    const chatId = settings.dailyReportChatId || settings.ordersGroupChatId;
    if (!chatId) {
      console.log('[Telegram] No chat ID configured for daily reports');
      return;
    }

    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Dohvati narudžbine za dan
    const orders = await db.order.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    // Kalkuliraj statistiku
    const ordersByStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let totalRevenue = 0;
    let b2bRevenue = 0;
    let retailRevenue = 0;

    orders.forEach((order) => {
      ordersByStatus[order.status]++;
      totalRevenue += order.total;
      if (order.isB2BOrder) {
        b2bRevenue += order.total;
      } else {
        retailRevenue += order.total;
      }
    });

    // Top proizvodi
    const productQuantities = new Map<string, { name: string; quantity: number; sku?: string }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productQuantities.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productQuantities.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            sku: item.product.sku || undefined,
          });
        }
      });
    });

    const topProducts = Array.from(productQuantities.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const stats: DailyStats = {
      date: targetDate,
      totalOrders: orders.length,
      ordersByStatus,
      totalRevenue,
      b2bRevenue,
      retailRevenue,
      topProducts,
    };

    const message = dailyReportMessage(stats);

    await client.sendMessage(chatId, message, {
      parseMode: 'HTML',
      disableWebPagePreview: true,
    });

    console.log('[Telegram] Daily report sent successfully');
  } catch (error) {
    console.error('[Telegram] Failed to send daily report:', error);
  }
}

/**
 * Test funkcija za slanje test poruke
 */
export async function sendTestMessage(chatId: string): Promise<void> {
  try {
    const { client } = await getTelegramClientAndSettings();

    if (!client) {
      throw new Error('Telegram client not configured');
    }

    const message = `✅ <b>Test Poruka</b>

Ovo je test poruka od Omerbasic bota.

Ako vidite ovu poruku, bot je pravilno konfiguriran! 🎉`;

    await client.sendMessage(chatId, message, {
      parseMode: 'HTML',
    });

    console.log('[Telegram] Test message sent successfully');
  } catch (error) {
    console.error('[Telegram] Failed to send test message:', error);
    throw error;
  }
}
