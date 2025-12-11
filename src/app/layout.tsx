import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import AuthProvider from '@/components/AuthProvider';
import { ConditionalNavbar } from '@/components/ConditionalNavbar';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';
import { ConditionalFooter } from '@/components/ConditionalFooter';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tpomerbasic.ba';

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
    default:
      "TP Omerbašić – Autodijelovi Tešanj | Putnička i teretna vozila, ADR, autopraonice",
    template: "%s | TP Omerbašić",
  },
  metadataBase: new URL(siteUrl),
  alternates: { canonical: '/' },
  description:
    "TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice. Rosulje bb, Jelah (Tešanj). Dostava širom BiH. Pozovite: 032/666-658, 061-962-359. Radno vrijeme: 08:00–18:00.",
  keywords: [
    "autodijelovi",
    "auto dijelovi",
    "putnička vozila",
    "teretna vozila",
    "kamionski dijelovi",
    "kamionski dijelovi BiH",
    "ADR oprema",
    "ADR oprema BiH",
    "autopraonice",
    "oprema za autopraonice",
    "oprema za autopraonice BiH",
    "dijelovi auta",
    "Tešanj",
    "Jelah",
    "Rosulje",
    "TP Omerbašić",
  ],
  openGraph: {
    title:
      "TP Omerbašić – Autodijelovi Tešanj | Putnička i teretna vozila, ADR, autopraonice",
    description:
      "TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice. Rosulje bb, Jelah (Tešanj). Dostava širom BiH. Pozovite: 032/666-658, 061-962-359.",
    siteName: "TP Omerbašić",
    type: "website",
    locale: "bs_BA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TP Omerbašić – Autodijelovi Tešanj",
    description:
      "TP Omerbašić – autodijelovi za putnička i teretna vozila, kamione, ADR opremu i opremu za autopraonice. Rosulje bb, Jelah (Tešanj). Dostava širom BiH.",
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
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
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
