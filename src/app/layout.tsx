import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Karaí',
  description: 'Plataforma de crowdfactoring con riesgo crediticio asistido por IA, cheques tokenizados y experiencia navegable para PyMEs e inversores.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
