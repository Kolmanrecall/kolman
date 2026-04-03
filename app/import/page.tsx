'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/shell';
import { SectionCard } from '@/components/section-card';

const HEADER_ALIASES = {
  full_name: ['navn', 'full_name', 'name', 'kunde'],
  email: ['epost', 'e-post', 'email', 'mail'],
  phone: ['telefon', 'phone', 'mobil', 'mobile'],
  city: ['by', 'city', 'område', 'area'],
  notes: ['notater', 'notes', 'kommentar', 'kommentarer'],
  source: ['kilde', 'source'],
  status_raw: ['status', 'stage', 'kategori'],
  last_contacted_at: ['siste kontakt', 'last contacted', 'last_contacted_at', 'sist kontaktet'],
};

type ParsedRow = {
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  source: string | null;
  status_raw: string | null;
  last_contacted_at: string | null;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function cleanValue(value: string | undefined) {
  const trimmed = (value ?? '').trim();
  return trimmed.length ? trimmed : null;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function mapHeaderIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function parseCsvToRows(csvText: string): ParsedRow[] {
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) throw new Error('CSV-filen må ha overskrifter og minst én rad.');

  const headers = splitCsvLine(lines[0]);
  const indexMap = {
    full_name: mapHeaderIndex(headers, HEADER_ALIASES.full_name),
    email: mapHeaderIndex(headers, HEADER_ALIASES.email),
    phone: mapHeaderIndex(headers, HEADER_ALIASES.phone),
    city: mapHeaderIndex(headers, HEADER_ALIASES.city),
    notes: mapHeaderIndex(headers, HEADER_ALIASES.notes),
    source: mapHeaderIndex(headers, HEADER_ALIASES.source),
    status_raw: mapHeaderIndex(headers, HEADER_ALIASES.status_raw),
    last_contacted_at: mapHeaderIndex(headers, HEADER_ALIASES.last_contacted_at),
  };

  if (indexMap.full_name === -1) throw new Error('Fant ikke kolonne for navn. Bruk for eksempel: navn, full_name eller name.');

  const rows = lines.slice(1)
    .map((line) => splitCsvLine(line))
    .map((cells) => ({
      full_name: cleanValue(cells[indexMap.full_name] ?? '') ?? '',
      email: indexMap.email >= 0 ? cleanValue(cells[indexMap.email]) : null,
      phone: indexMap.phone >= 0 ? cleanValue(cells[indexMap.phone]) : null,
      city: indexMap.city >= 0 ? cleanValue(cells[indexMap.city]) : null,
      notes: indexMap.notes >= 0 ? cleanValue(cells[indexMap.notes]) : null,
      source: indexMap.source >= 0 ? cleanValue(cells[indexMap.source]) : null,
      status_raw: indexMap.status_raw >= 0 ? cleanValue(cells[indexMap.status_raw]) : null,
      last_contacted_at: indexMap.last_contacted_at >= 0 ? cleanValue(cells[indexMap.last_contacted_at]) : null,
    }))
    .filter((row) => row.full_name.length > 0);

  if (!rows.length) throw new Error('Fant ingen gyldige rader i CSV-filen.');
  return rows;
}

function downloadTemplate() {
  const template = [
    'navn,email,telefon,by,status,notater,siste kontakt',
    'Eksempel Kontakt 1,eksempel1@firma.no,90000000,Oslo,Vurderer salg,Eksempel på notat,2025-11-14',
    'Eksempel Kontakt 2,eksempel2@firma.no,91111111,Bergen,Tidligere kunde,Eksempel på historikk,2024-06-01',
  ].join('\n');

  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'kolman-template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const helperText = useMemo(() => {
    if (!file) return 'Bruk en CSV med navn og minst ett kontaktpunkt som e-post eller telefon.';
    if (previewCount) return `Klar til import: ${previewCount} kontakt${previewCount === 1 ? '' : 'er'} fra ${file.name}.`;
    return `Valgt fil: ${file.name}`;
  }, [file, previewCount]);

  async function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);
    setMessage(null);
    setError(null);
    setPreviewCount(null);
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const rows = parseCsvToRows(text);
      setPreviewCount(rows.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke lese CSV-filen.');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError('Velg en CSV-fil først.');
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const rows = parseCsvToRows(text);
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Importen feilet.');

      setMessage(`Import ferdig. ${json.inserted ?? rows.length} kontakter ble lagret.`);
      setFile(null);
      setPreviewCount(null);
      const input = document.getElementById('csv-upload') as HTMLInputElement | null;
      if (input) input.value = '';
      router.refresh();
      setTimeout(() => router.push('/contacts'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Importen feilet.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.26em] text-[#c6a884]">Importer</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Importer kontakter</h1>
          <p className="mt-3 max-w-3xl text-[#d4c4b2]">Last opp en CSV fra CRM, Excel eller Google Sheets for å få kontaktlisten din inn i Kolman.</p>
        </div>

        <SectionCard title="CSV-import" description="Start med egne kontakter og bygg videre derfra.">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="block w-full rounded-[24px] border border-dashed border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] p-6 text-sm text-[#d4c4b2]"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? 'Importerer…' : 'Last opp fil'}
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-full border border-[rgba(220,194,163,0.10)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#efe2d1] transition hover:bg-[rgba(255,245,232,0.06)]"
              >
                Last ned mal
              </button>
            </div>

            <p className="text-sm text-[#b8aa98]">{helperText}</p>
            {message ? <p className="text-sm text-[#dcbf9e]">{message}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </form>
        </SectionCard>
      </div>
    </Shell>
  );
}
