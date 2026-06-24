import { Inter } from 'next/font/google';
import Link from 'next/link';
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
          <span className="app-header__title">GBG Catalog</span>
          <Link href="/" className="app-header__link">
            Начало
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
