import { NextResponse } from 'next/server';

/**
 * Telegram Webhook za dohvaćanje Chat ID-a
 *
 * Ovaj endpoint prima poruke od Telegrama i logira chat informacije
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 TELEGRAM WEBHOOK - Nova poruka');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const message = body.message || body.channel_post;

    if (message?.chat) {
      const chat = message.chat;

      console.log('💬 Chat Info:');
      console.log('   Type:', chat.type);
      console.log('   Title:', chat.title || 'N/A');
      console.log('   🆔 CHAT ID:', chat.id);
      console.log('   Username:', chat.username || 'N/A');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('✅ Kopiraj ovaj Chat ID:');
      console.log('   ', chat.id);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Uvijek vraćaj ok da Telegram ne retry-a
  }
}

/**
 * GET endpoint za provjeru da webhook radi
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint je aktivan',
    instructions: 'Pošalji poruku u Telegram grupi sa botom da dobiješ Chat ID'
  });
}
