import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'World Cup 2026 Predictions | Football Hub',
  description: 'Dự đoán kết quả các trận đấu World Cup 2026 (1X2, Handicap), tính điểm và leo hạng cùng bạn bè. Sân chơi dự đoán bóng đá phi thương mại.',
  keywords: 'world cup 2026, dự đoán bóng đá, cá độ bóng đá vui, prediction wc 2026',
  icons: {
    icon: '/wc26.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
