import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendTestMessage } from '@/lib/telegram/notification-service';
import { z } from 'zod';

/**
 * Šalje test poruku u Telegram chat
 * ZAŠTIĆEN - samo ADMIN može pristupiti
 */
const testMessageSchema = z.object({
  chatId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validation = testMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { chatId } = validation.data;

    await sendTestMessage(chatId);

    return NextResponse.json({
      message: 'Test poruka uspješno poslana!',
    });

  } catch (error: any) {
    console.error('[TELEGRAM_TEST] Error details:', error);

    // Ekstraktuj detaljnu poruku greške
    let errorMessage = error.message || 'Greška prilikom slanja test poruke';

    // Ako je Telegram API greška, daj konkretnije informacije
    if (errorMessage.includes('Forbidden')) {
      errorMessage = 'Bot nema permisiju slanja poruka u ovu grupu. Provjeri da li je bot admin u grupi.';
    } else if (errorMessage.includes('Bad Request: chat not found')) {
      errorMessage = 'Chat ID nije pronađen. Provjeri da li je Chat ID ispravan.';
    } else if (errorMessage.includes('Bad Request: group chat was upgraded to a supergroup')) {
      errorMessage = 'Grupa je nadograđena u supergroup. Koristi novi Chat ID.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message
      },
      { status: 500 }
    );
  }
}
