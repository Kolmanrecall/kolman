'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './logout-button';

const links = [
  { href: '/dashboard', label: 'Oversikt' },
  { href: '/contacts', label: 'Kontakter' },
  { href: '/import', label: 'Importer' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              'rounded-full border px-4 py-2 transition',
              isActive
                ? 'border-[rgba(183,146,104,0.24)] bg-[rgba(183,146,104,0.09)] text-white'
                : 'border-transparent text-[#b4a390] hover:border-[rgba(220,194,163,0.10)] hover:bg-[rgba(255,245,232,0.03)] hover:text-white',
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
