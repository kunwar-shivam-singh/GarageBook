import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./components/PwaRegister";
import Providers from "./providers";

import Script from "next/script";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "GarageBook - Digital Register",
  description: "Digital Register for Every Motorcycle Garage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GarageBook",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GarageBook" />
        <meta name="theme-color" content="#2563eb" />
        <Script
          id="pwa-dev-cleanup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    var unregistered = false;
                    for (var i = 0; i < registrations.length; i++) {
                      registrations[i].unregister();
                      unregistered = true;
                    }
                    if (unregistered) {
                      console.log('Unregistered stale local service worker in development.');
                      if (window.caches) {
                        caches.keys().then(function(names) {
                          for (var j = 0; j < names.length; j++) {
                            caches.delete(names[j]);
                          }
                        });
                      }
                      window.location.reload();
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Providers>
          {children}
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
