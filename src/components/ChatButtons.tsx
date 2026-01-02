import { FaViber, FaWhatsapp } from "react-icons/fa";

const CHAT_NUMBER_RAW = "38761962359";
const CHAT_NUMBER_WITH_PLUS = "+38761962359";

export function ChatButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <a
        href={`https://wa.me/${CHAT_NUMBER_RAW}`}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp chat: 00387 61 962359"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        aria-label="Otvori WhatsApp chat"
      >
        WhatsApp
      </a>
      <a
        href={`viber://chat?number=${encodeURIComponent(CHAT_NUMBER_WITH_PLUS)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Viber chat: 00387 61 962359"
        className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
        aria-label="Otvori Viber chat"
      >
        Viber
      </a>
    </div>
  );
}

export function FloatingChatButtons() {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2">
      <a
        href={`https://wa.me/${CHAT_NUMBER_RAW}`}
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp chat: 00387 61 962359"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
        aria-label="Otvori WhatsApp chat"
      >
        <FaWhatsapp className="h-6 w-6" aria-hidden="true" />
      </a>
      <a
        href={`viber://chat?number=${encodeURIComponent(CHAT_NUMBER_WITH_PLUS)}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Viber chat: 00387 61 962359"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition hover:bg-violet-700"
        aria-label="Otvori Viber chat"
      >
        <FaViber className="h-6 w-6" aria-hidden="true" />
      </a>
    </div>
  );
}
