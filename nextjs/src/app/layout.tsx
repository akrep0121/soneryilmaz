import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Soner Yılmaz | FinTech Geliştiricisi & Yatırım Analisti",
  description: "Finansal piyasaları kod ve yapay zeka ile analiz eden, halka arz ve borsa stratejileri geliştiren junior yazılımcı portfolyosu.",
  keywords: "Soner Yılmaz, Borsa, Yatırım, Halka Arz, BES, Yazılım, Yapay Zeka, FinTech",
  openGraph: {
    title: "Soner Yılmaz | FinTech Geliştiricisi & Yatırım Analisti",
    description: "Finansal piyasaları kod ve yapay zeka ile analiz eden, halka arz ve borsa stratejileri geliştiren junior yazılımcı portfolyosu.",
    url: "https://soneryilmaz.vercel.app",
    siteName: "Soner Yılmaz",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@soner_yilmz",
    creator: "@soner_yilmz",
  },
  verification: {
    google: "o7JFkAV3NWZulmJ98WX6VZ6mnVI60aVpPMr2u-ozLPU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="canonical" href="https://soneryilmaz.vercel.app" id="site-canonical" />
        <meta name="author" content="Soner Yılmaz" />
        <script
          type="application/ld+json"
          id="structured-data-ld"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Soner Yılmaz",
              url: "https://soneryilmaz.vercel.app",
              description: "Finansal piyasaları kod ve yapay zeka ile analiz eden, halka arz ve borsa stratejileri geliştiren junior yazılımcı portfolyosu.",
              author: {
                "@type": "Person",
                name: "Soner Yılmaz",
                jobTitle: "FinTech Geliştiricisi & Yatırım Analisti",
              },
            }),
          }}
        />
      </head>
      <body className="overflow-x-hidden bg-black text-[#ededed]">
        {children}
        <Script 
          src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js" 
          strategy="beforeInteractive" 
        />
        <Script src="https://unpkg.com/lucide@latest" />
      </body>
    </html>
  );
}
