/**
 * Telegram Bot API Client
 *
 * Simple client for sending messages to Telegram using Bot API
 */

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

interface TelegramPhoto {
  chat_id: string | number;
  photo: string; // URL or file_id
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export class TelegramClient {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Šalje text poruku u Telegram chat
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableWebPagePreview?: boolean;
      disableNotification?: boolean;
    }
  ): Promise<void> {
    try {
      const payload: TelegramMessage = {
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode,
        disable_web_page_preview: options?.disableWebPagePreview,
        disable_notification: options?.disableNotification,
      };

      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Telegram] API Error Response:', error);
        throw new Error(
          `Telegram API error: ${error.description || JSON.stringify(error)}`
        );
      }

      const data = await response.json();
      console.log('[Telegram] Message sent successfully:', data.result?.message_id);
    } catch (error) {
      console.error('[Telegram] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Šalje sliku sa caption tekstom u Telegram chat
   */
  async sendPhoto(
    chatId: string | number,
    photoUrl: string,
    caption?: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    }
  ): Promise<void> {
    try {
      const payload: TelegramPhoto = {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: options?.parseMode,
      };

      const response = await fetch(`${this.baseUrl}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Telegram] API Error Response:', error);
        throw new Error(
          `Telegram API error: ${error.description || JSON.stringify(error)}`
        );
      }

      const data = await response.json();
      console.log('[Telegram] Photo sent successfully:', data.result?.message_id);
    } catch (error) {
      console.error('[Telegram] Failed to send photo:', error);
      throw error;
    }
  }

  /**
   * Dohvaća informacije o bot-u
   */
  async getMe(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`);

      if (!response.ok) {
        throw new Error('Failed to get bot info');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('[Telegram] Failed to get bot info:', error);
      throw error;
    }
  }

  /**
   * Dohvaća updates (korisno za dobijanje chat ID-a)
   */
  async getUpdates(offset?: number): Promise<any[]> {
    try {
      const url = offset
        ? `${this.baseUrl}/getUpdates?offset=${offset}`
        : `${this.baseUrl}/getUpdates`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to get updates');
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error('[Telegram] Failed to get updates:', error);
      throw error;
    }
  }
}

/**
 * Helper funkcija za kreiranje Telegram klijenta iz environment-a
 */
export function createTelegramClient(): TelegramClient | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[Telegram] Bot token not configured');
    return null;
  }

  return new TelegramClient(botToken);
}
