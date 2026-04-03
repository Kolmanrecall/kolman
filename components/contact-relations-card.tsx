'use client';

import { useState } from 'react';

type Relation = {
  id: string;
  label: string;
  name: string;
};

export function ContactRelationsCard() {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('Relasjon');
  const [items, setItems] = useState<Relation[]>([]);

  function handleAdd() {
    if (!name.trim()) return;
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name: name.trim(), label: label.trim() || 'Relasjon' },
    ]);
    setName('');
    setLabel('Relasjon');
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#b8aa98]">Koble personer sammen når flere kontakter hører til samme bolig, prosess eller oppdrag.</p>

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Navn på kontakt eller relasjon"
          className="w-full rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[rgba(183,146,104,0.30)]"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="F.eks. Melselger"
          className="w-full rounded-2xl border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.02)] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8e7c69] focus:border-[rgba(183,146,104,0.30)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.24)]"
        >
          Legg til
        </button>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-sm">
              <div className="font-medium text-white">{item.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8e7c69]">{item.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.02)] px-4 py-6 text-sm text-[#8e7c69]">
          Ingen relasjoner lagt til ennå.
        </div>
      )}
    </div>
  );
}
