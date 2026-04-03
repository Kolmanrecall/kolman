import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kolman',
  description: 'Webverktøy for meglere som jobber med leads, oppfølging og kontaktarbeid.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
