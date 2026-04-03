'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Contact } from '@/lib/types';
import { StatusBadge, toneFromStatus } from './status-badge';

function formatDate(date: string | null) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export function ContactsTableClient({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');

  const statusOptions = useMemo(() => {
    return ['alle', ...Array.from(new Set(contacts.map((c) => c.status_raw).filter(Boolean) as string[]))];
  }, [contacts]);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const haystack = [contact.full_name, contact.email, contact.phone, contact.city, contact.status_raw, contact.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === 'alle' || (contact.status_raw || '') === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [contacts, query, statusFilter]);

  const warmCount = filtered.filter((c) => ['hot', 'warm'].includes(toneFromStatus(c.status_raw))).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_220px_auto]">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Søk i kontaktbase</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk på navn, by, notat eller status"
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[rgba(183,146,104,0.30)]"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#8e7c69]">Filter på status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm text-white outline-none focus:border-[rgba(183,146,104,0.30)]"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'alle' ? 'Alle statuser' : option}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="kolman-surface rounded-2xl px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Viser</div>
            <div className="mt-1 text-2xl font-semibold text-white">{filtered.length}</div>
          </div>
          <div className="kolman-surface rounded-2xl px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8e7c69]">Varme leads</div>
            <div className="mt-1 text-2xl font-semibold text-white">{warmCount}</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.018)]">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-[rgba(255,245,232,0.02)]">
            <tr>
              <th className="px-5 py-4 text-left font-medium text-[#b8aa98]">Kontakt</th>
              <th className="px-5 py-4 text-left font-medium text-[#b8aa98]">Status</th>
              <th className="px-5 py-4 text-left font-medium text-[#b8aa98]">By</th>
              <th className="px-5 py-4 text-left font-medium text-[#b8aa98]">Siste kontakt</th>
              <th className="px-5 py-4 text-left font-medium text-[#b8aa98]">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] bg-transparent">
            {filtered.length ? (
              filtered.map((contact) => (
                <tr key={contact.id} className="transition hover:bg-[rgba(255,245,232,0.02)]">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{contact.full_name}</div>
                    <div className="mt-1 text-xs text-[#8e7c69]">{contact.email || contact.phone || 'Ingen kontaktinfo'}</div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge value={contact.status_raw ?? 'Ukjent'} tone={toneFromStatus(contact.status_raw)} /></td>
                  <td className="px-5 py-4 text-[#b8aa98]">{contact.city ?? '—'}</td>
                  <td className="px-5 py-4 text-[#b8aa98]">{formatDate(contact.last_contacted_at)}</td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="inline-flex rounded-full border border-[rgba(183,146,104,0.22)] bg-[rgba(183,146,104,0.08)] px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.14)]"
                    >
                      Åpne kontakt
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-[#8e7c69]">
                  Ingen kontakter matcher søket eller filteret ditt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
