import { Inter } from 'next/font/google';
import { AppHeaderNav } from '@/components/AppHeaderNav';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata = {
  title: 'GBG Catalog',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={inter.variable}>
      <body>
        <header className="app-header">
          <AppHeaderNav />
        </header>
        {children}
      </body>
    </html>
  );
}
