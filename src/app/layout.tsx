import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://acaidadaiane.vercel.app'),
  title: 'Açaí da Daiane | Cardápio Digital & Pedidos Online',
  description:
    'Cardápio digital oficial do Açaí da Daiane. Peça seu açaí artesanal, tigelas e barcas com frutas frescas, adicionais nobres e entrega rápida em Recife.',
  keywords: ['açaí', 'cardápio digital', 'pedidos online', 'delivery recife', 'açaí artesanal'],
  authors: [{ name: 'Açaí da Daiane' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://acaidadaiane.vercel.app',
    siteName: 'Açaí da Daiane',
    title: 'Açaí da Daiane | Cardápio Digital & Pedidos Online',
    description:
      'Cardápio digital oficial do Açaí da Daiane. Peça seu açaí artesanal, tigelas e barcas com frutas frescas, adicionais nobres e entrega rápida em Recife.',
    images: [
      {
        url: '/og-image.png',
        width: 512,
        height: 512,
        alt: 'Logo Açaí da Daiane',
      },
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Logo Açaí da Daiane',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Açaí da Daiane | Cardápio Digital & Pedidos Online',
    description:
      'Cardápio digital oficial do Açaí da Daiane. Peça seu açaí artesanal, tigelas e barcas com frutas frescas, adicionais nobres e entrega rápida em Recife.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#7c3aed',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* PWA: permite iOS adicionar à tela inicial com suporte a push */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Açaí Daiane" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>{children}</CartProvider>
          </LanguageProvider>
        </ThemeProvider>
        {/* Registro do Service Worker - deve ser inline para rodar antes de qualquer React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
