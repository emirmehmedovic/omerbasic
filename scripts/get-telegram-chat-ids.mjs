#!/usr/bin/env node

/**
 * Script za dohvaćanje Chat ID-ova Telegram grupa
 *
 * Pokreni: node scripts/get-telegram-chat-ids.mjs
 */

const BOT_TOKEN = '8569437415:AAEPRFvoXsDpWDSQh3B1TL0s1atTr1XHss0';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📱 TELEGRAM CHAT ID FINDER');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

async function getChatIds() {
  try {
    console.log('🔍 Dohvaćam poruke iz Telegrama...');
    console.log('');

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      console.log('❌ Telegram API greška:', data.description);
      return;
    }

    console.log(`✅ Primljeno ${data.result.length} updates-a`);
    console.log('');

    // Ekstraktuj grupe
    const chats = new Map();

    data.result.forEach((update) => {
      const message = update.message || update.channel_post;
      if (message?.chat) {
        const chat = message.chat;
        // Samo supergrupe - one su stabilnije i preporučene
        if (chat.type === 'supergroup') {
          chats.set(chat.id, {
            id: chat.id,
            title: chat.title,
            type: chat.type,
          });
        }
      }
    });

    if (chats.size === 0) {
      console.log('⚠️  NEMA PRONAĐENIH GRUPA');
      console.log('');
      console.log('📝 UPUTE:');
      console.log('   1. Otvori Telegram');
      console.log('   2. Idi u grupu gdje je bot dodan');
      console.log('   3. Pošalji BILO ŠTA u grupi (npr. "test")');
      console.log('   4. Pokreni ovaj script ponovo');
      console.log('');
      console.log('💡 TIP:Bot mora biti DODAN U GRUPU prije slanja poruke!');
      console.log('');
      return;
    }

    console.log(`🎉 Pronađeno ${chats.size} grupa!\n`);

    Array.from(chats.values()).forEach((chat, index) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Grupa ${index + 1}: ${chat.title}`);
      console.log(`🆔 Chat ID: \x1b[32m${chat.id}\x1b[0m`);
      console.log(`   Type: ${chat.type}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ KOPIRAJ Chat ID brojeve i unesi u admin panel:');
    console.log('   👉 http://localhost:3000/admin/telegram-settings');
    console.log('');

  } catch (error) {
    console.error('❌ Greška:', error.message);
    console.log('');
    console.log('🔧 Provjeri:');
    console.log('   1. Da li je bot token ispravan');
    console.log('   2. Da li imaš internet konekciju');
    console.log('');
  }
}

getChatIds();
