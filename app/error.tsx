'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0b0908] px-6 py-16 text-[#f5efe7]">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-[rgba(220,194,163,0.12)] bg-[rgba(255,245,232,0.04)] p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman Eiendom</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Vi får ikke hentet dataene akkurat nå</h1>
        <p className="mt-4 leading-7 text-[#d4c4b2]">
          Dataene er ikke slettet. Prøv å laste siden på nytt. Hvis feilen varer, vent litt før du importerer på nytt.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-7 rounded-full border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.12)] px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#ead3b7] transition hover:bg-[rgba(183,146,104,0.20)]"
        >
          Prøv igjen
        </button>
      </div>
    </div>
  );
}
