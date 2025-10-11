import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { Toaster } from '@/components/ui/sonner';
import { AuthContextProvider } from '@/context/AuthContext';
import Providers from '@/lib/Providers';
import 'react-quill/dist/quill.snow.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Te Quiero Feliz',
  description: 'Te Quiero Feliz',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthContextProvider>
          <Providers>
            <div className="flex flex-col min-h-screen justify-between">
              <Navbar />
              <div className="overflow-x-hidden pt-[86px]">
                <main>{children}</main>
              </div>
              <Footer />
            </div>
          </Providers>
        </AuthContextProvider>
        <Toaster richColors theme="light" />
      </body>
    </html>
  );
}
