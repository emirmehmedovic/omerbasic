import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from '@/components/AuthProvider';
import { ConditionalNavbar } from '@/components/ConditionalNavbar';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';
import { ConditionalFooter } from '@/components/ConditionalFooter';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TP Omerbašić – Autodijelovi | Putnička i teretna vozila, ADR, autopraonice",
    template: "%s | TP Omerbašić",
  },
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  description:
    "Autodijelovi za putnička i teretna vozila, ADR oprema i oprema za autopraonice. Rosulje bb, Jelah. Pozovite: 032/666-658, 061-962-359. Radno vrijeme: 08:00–18:00.",
  keywords: [
    "autodijelovi",
    "putnička vozila",
    "teretna vozila",
    "ADR oprema",
    "autopraonice",
    "dijelovi auta",
    "Jelah",
    "Rosulje",
    "TP Omerbašić",
  ],
  openGraph: {
    title: "TP Omerbašić – Autodijelovi | Putnička i teretna vozila, ADR, autopraonice",
    description:
      "Autodijelovi za putnička i teretna vozila, ADR oprema i oprema za autopraonice. Rosulje bb, Jelah. Pozovite: 032/666-658, 061-962-359.",
    siteName: "TP Omerbašić",
    type: "website",
    locale: "bs_BA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TP Omerbašić – Autodijelovi",
    description:
      "Autodijelovi za putnička i teretna vozila, ADR oprema i oprema za autopraonice. Rosulje bb, Jelah.",
  },
  icons: {
    icon: "/images/omerbasic.png",
    apple: "/images/omerbasic.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bs">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-app min-h-screen`}
      >
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <ConditionalNavbar />
            {children}
            <ConditionalFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
