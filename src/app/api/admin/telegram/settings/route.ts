import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * Dohvaća Telegram settings
 * ZAŠTIĆEN - samo ADMIN može pristupiti
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await db.telegramSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!settings) {
      // Kreiraj default settings ako ne postoje
      const defaultSettings = await db.telegramSettings.create({
        data: {
          ordersEnabled: true,
          lowStockEnabled: true,
          dailyReportEnabled: true,
          dailyReportTime: '18:00',
        },
      });
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);

  } catch (error) {
    console.error('[TELEGRAM_SETTINGS_GET]', error);
    return NextResponse.json(
      { error: 'Greška prilikom dohvaćanja settings-a' },
      { status: 500 }
    );
  }
}

/**
 * Ažurira Telegram settings
 * ZAŠTIĆEN - samo ADMIN može pristupiti
 */
const updateSettingsSchema = z.object({
  botToken: z.string().optional(),
  ordersGroupChatId: z.string().optional().nullable(),
  ordersEnabled: z.boolean().optional(),
  lowStockGroupChatId: z.string().optional().nullable(),
  lowStockEnabled: z.boolean().optional(),
  dailyReportEnabled: z.boolean().optional(),
  dailyReportTime: z.string().optional(),
  dailyReportChatId: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Dohvati ili kreiraj settings
    let settings = await db.telegramSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!settings) {
      settings = await db.telegramSettings.create({
        data: {
          ordersEnabled: true,
          lowStockEnabled: true,
          dailyReportEnabled: true,
          dailyReportTime: '18:00',
        },
      });
    }

    // Ažuriraj settings
    const updatedSettings = await db.telegramSettings.update({
      where: { id: settings.id },
      data: validation.data,
    });

    return NextResponse.json(updatedSettings);

  } catch (error) {
    console.error('[TELEGRAM_SETTINGS_PATCH]', error);
    return NextResponse.json(
      { error: 'Greška prilikom ažuriranja settings-a' },
      { status: 500 }
    );
  }
}
