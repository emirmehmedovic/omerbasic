#!/bin/bash

# Script za dobijanje Chat ID-ova iz Telegrama
# Koristi bot token iz baze podataka

BOT_TOKEN="8569437415:AAEPRFvoXsDpWDSQh3B1TL0s1atTr1XHss0"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 TELEGRAM CHAT ID FINDER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Dohvaćam poruke..."
echo ""

# Dohvati updates
RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates")

# Provjeri da li ima updates
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Uspješno povezan sa Telegram API"
  echo ""

  # Ekstraktuj chat informacije
  echo "$RESPONSE" | jq -r '.result[] | select(.message.chat.type == "group" or .message.chat.type == "supergroup") | "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📍 Grupa: \(.message.chat.title)\n🆔 Chat ID: \(.message.chat.id)\n   Type: \(.message.chat.type)\n"'

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 UPUTE:"
  echo "   1. Ako ne vidiš grupe, pošalji poruku u svaku grupu"
  echo "   2. Pokreni script ponovo"
  echo "   3. Kopiraj Chat ID brojeve"
  echo ""
else
  echo "❌ Greška prilikom dohvaćanja updates-a"
  echo ""
  echo "Full response:"
  echo "$RESPONSE" | jq '.'
fi
