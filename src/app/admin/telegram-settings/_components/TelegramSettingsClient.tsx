'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiSave, FiRefreshCw, FiSend, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface TelegramSettings {
  id: string;
  botToken: string | null;
  ordersGroupChatId: string | null;
  ordersEnabled: boolean;
  lowStockGroupChatId: string | null;
  lowStockEnabled: boolean;
  dailyReportEnabled: boolean;
  dailyReportTime: string;
  dailyReportChatId: string | null;
}

interface ChatInfo {
  id: number;
  title: string;
  type: string;
  memberCount?: number;
}

export function TelegramSettingsClient() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Form state
  const [botToken, setBotToken] = useState('');
  const [ordersGroupChatId, setOrdersGroupChatId] = useState('');
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [lowStockGroupChatId, setLowStockGroupChatId] = useState('');
  const [lowStockEnabled, setLowStockEnabled] = useState(true);
  const [dailyReportEnabled, setDailyReportEnabled] = useState(true);
  const [dailyReportTime, setDailyReportTime] = useState('18:00');
  const [dailyReportChatId, setDailyReportChatId] = useState('');

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/admin/telegram/settings');
      const data = response.data;
      setSettings(data);

      // Populate form
      setBotToken(data.botToken || '');
      setOrdersGroupChatId(data.ordersGroupChatId || '');
      setOrdersEnabled(data.ordersEnabled);
      setLowStockGroupChatId(data.lowStockGroupChatId || '');
      setLowStockEnabled(data.lowStockEnabled);
      setDailyReportEnabled(data.dailyReportEnabled);
      setDailyReportTime(data.dailyReportTime);
      setDailyReportChatId(data.dailyReportChatId || '');
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Greška prilikom učitavanja settings-a');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await axios.patch('/api/admin/telegram/settings', {
        botToken: botToken || null,
        ordersGroupChatId: ordersGroupChatId || null,
        ordersEnabled,
        lowStockGroupChatId: lowStockGroupChatId || null,
        lowStockEnabled,
        dailyReportEnabled,
        dailyReportTime,
        dailyReportChatId: dailyReportChatId || null,
      });
      toast.success('Settings uspješno sačuvani!');
      loadSettings();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Greška prilikom spremanja settings-a');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetChatIds = async () => {
    try {
      setIsLoadingChats(true);
      const response = await axios.get('/api/admin/telegram/get-chat-ids');
      setChats(response.data.chats || []);
      if (response.data.chats?.length > 0) {
        toast.success(`Pronađeno ${response.data.chats.length} grupa!`);
      } else {
        toast.error(response.data.message || 'Nema pronađenih grupa');
      }
    } catch (error: any) {
      console.error('Failed to get chat IDs:', error);
      toast.error(error.response?.data?.error || 'Greška prilikom dohvaćanja grupa');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleTestMessage = async (chatId: string, label: string) => {
    if (!chatId) {
      toast.error('Unesi Chat ID prvo!');
      return;
    }

    try {
      await axios.post('/api/admin/telegram/test', { chatId });
      toast.success(`Test poruka poslana u ${label}!`);
    } catch (error: any) {
      console.error('Failed to send test message:', error);
      toast.error(error.response?.data?.error || 'Greška prilikom slanja test poruke');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Token */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bot Token</h2>
          <p className="text-sm text-gray-600 mt-1">
            Token od BotFather (@BotFather na Telegramu)
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bot Token
          </label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Token se čuva sigurno u bazi podataka
          </p>
        </div>
      </div>

      {/* Get Chat IDs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Telegram Grupe</h2>
          <p className="text-sm text-gray-600 mt-1">
            Dohvati Chat ID-ove grupa u kojima se bot nalazi
          </p>
        </div>
        <button
          onClick={handleGetChatIds}
          disabled={isLoadingChats || !botToken}
          className="bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
        >
          <FiRefreshCw className={isLoadingChats ? 'animate-spin' : ''} />
          {isLoadingChats ? 'Dohvaćam...' : 'Dohvati Chat ID-ove'}
        </button>

        {chats.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium text-gray-700">Pronađene grupe:</p>
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="border border-gray-200 rounded-lg p-3 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{chat.title}</div>
                  <div className="text-sm text-gray-600">
                    Chat ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{chat.id}</code>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(chat.id.toString());
                    toast.success('Chat ID kopiran!');
                  }}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Kopiraj
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">🛒 Narudžbine</h2>
            <p className="text-sm text-gray-600 mt-1">
              Notifikacije za nove narudžbine i promjene statusa
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ordersEnabled}
              onChange={(e) => setOrdersEnabled(e.target.checked)}
              className="w-5 h-5 text-slate-600 rounded"
            />
            <span className="ml-2 text-sm font-medium">
              {ordersEnabled ? (
                <span className="text-green-600 flex items-center gap-1">
                  <FiCheckCircle /> Uključeno
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <FiXCircle /> Isključeno
                </span>
              )}
            </span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chat ID grupe
          </label>
          <input
            type="text"
            value={ordersGroupChatId}
            onChange={(e) => setOrdersGroupChatId(e.target.value)}
            placeholder="-1001234567890"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
          />
        </div>
        <button
          onClick={() => handleTestMessage(ordersGroupChatId, 'grupu za narudžbine')}
          disabled={!ordersGroupChatId}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <FiSend /> Pošalji test poruku
        </button>
      </div>

      {/* Low Stock Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📦 Low Stock</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upozorenja kada zalihe padnu ispod praga
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockEnabled}
              onChange={(e) => setLowStockEnabled(e.target.checked)}
              className="w-5 h-5 text-slate-600 rounded"
            />
            <span className="ml-2 text-sm font-medium">
              {lowStockEnabled ? (
                <span className="text-green-600 flex items-center gap-1">
                  <FiCheckCircle /> Uključeno
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <FiXCircle /> Isključeno
                </span>
              )}
            </span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chat ID grupe
          </label>
          <input
            type="text"
            value={lowStockGroupChatId}
            onChange={(e) => setLowStockGroupChatId(e.target.value)}
            placeholder="-1001234567891"
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
          />
        </div>
        <button
          onClick={() => handleTestMessage(lowStockGroupChatId, 'grupu za low stock')}
          disabled={!lowStockGroupChatId}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <FiSend /> Pošalji test poruku
        </button>
      </div>

      {/* Daily Report */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">📊 Dnevni Izvještaj</h2>
            <p className="text-sm text-gray-600 mt-1">
              Automatski izvještaj na kraju radnog dana
            </p>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dailyReportEnabled}
              onChange={(e) => setDailyReportEnabled(e.target.checked)}
              className="w-5 h-5 text-slate-600 rounded"
            />
            <span className="ml-2 text-sm font-medium">
              {dailyReportEnabled ? (
                <span className="text-green-600 flex items-center gap-1">
                  <FiCheckCircle /> Uključeno
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <FiXCircle /> Isključeno
                </span>
              )}
            </span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vrijeme slanja
            </label>
            <input
              type="time"
              value={dailyReportTime}
              onChange={(e) => setDailyReportTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chat ID (opcionalno)
            </label>
            <input
              type="text"
              value={dailyReportChatId}
              onChange={(e) => setDailyReportChatId(e.target.value)}
              placeholder="Ili ista grupa kao narudžbine"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Ako nije unesen Chat ID, koristit će se grupa za narudžbine
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
        >
          <FiSave />
          {isSaving ? 'Spremanje...' : 'Spremi Settings'}
        </button>
      </div>
    </div>
  );
}
