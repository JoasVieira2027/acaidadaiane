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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>{children}</CartProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
