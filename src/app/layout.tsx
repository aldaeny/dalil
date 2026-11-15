import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'دليل — Dalil | بوصلتك الشاملة للمدينة',
  description:
    'تطبيق دليل (Dalil) لاكتشاف المطاعم، الكافيهات، محطات الوقود، الأماكن الترفيهية، الأسواق والمولات في بغداد ومدن العراق.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-100">
        {children}
      </body>
    </html>
  );
}
