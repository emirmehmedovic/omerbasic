import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { TelegramClient } from '@/lib/telegram/telegram-client';

/**
 * Dohvaća chat ID-ove iz Telegram updates
 *
 * Endpoint za dobijanje liste grupa u kojima se bot nalazi
 * ZAŠTIĆEN - samo ADMIN može pristupiti
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Autentifikacija - samo ADMIN
    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Dohvati bot token iz baze
    const settings = await db.telegramSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!settings?.botToken) {
      return NextResponse.json(
        { error: 'Bot token nije konfiguriran. Prvo unesi bot token.' },
        { status: 400 }
      );
    }

    // Kreiraj Telegram klijent
    const client = new TelegramClient(settings.botToken);

    // Dohvati updates
    const updates = await client.getUpdates();

    // Ekstraktuj chat informacije
    const chats = new Map<number, any>();

    updates.forEach((update: any) => {
      const message = update.message || update.channel_post;
      if (message?.chat) {
        const chat = message.chat;
        // Samo supergrupe - one su stabilnije i preporučene
        if (chat.type === 'supergroup') {
          chats.set(chat.id, {
            id: chat.id,
            title: chat.title,
            type: chat.type,
            memberCount: chat.member_count,
          });
        }
      }
    });

    const chatList = Array.from(chats.values());

    if (chatList.length === 0) {
      return NextResponse.json({
        message: 'Nema pronađenih grupa. Dodaj bota u grupu i pošalji poruku u grupi.',
        chats: [],
      });
    }

    return NextResponse.json({
      message: 'Pronađene grupe',
      chats: chatList,
    });

  } catch (error) {
    console.error('[TELEGRAM_GET_CHAT_IDS]', error);
    return NextResponse.json(
      { error: 'Greška prilikom dohvaćanja chat ID-ova' },
      { status: 500 }
    );
  }
}
