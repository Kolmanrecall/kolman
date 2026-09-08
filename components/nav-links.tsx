'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './logout-button';

const links = [
  { href: '/dashboard', label: 'Oversikt' },
  { href: '/recall', label: 'Oppfølgingskø' },
  { href: '/contacts', label: 'Kontakter' },
  { href: '/cases', label: 'Saker' },
  { href: '/import', label: 'Importer' },
  { href: '/data', label: 'Data' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-5 text-[13px]">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

        return (
          <Link
            key={link.href}
            href={link.href as any}
            className={[
              'border-b py-1 transition kolman-focus-ring',
              isActive
                ? 'border-[#b79268] text-[#f0ebe4]'
                : 'border-transparent text-[#a79e92] hover:border-[#6e5637] hover:text-[#f0ebe4]',
            ].join(' ')}
          >
            {link.label}
          </Link>
        );
      })}
      <LogoutButton />
    </nav>
  );
}
