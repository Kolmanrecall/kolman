'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Mode = 'login' | 'signup';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const helperText = useMemo(() => {
    return mode === 'login'
      ? 'Logg inn med e-posten din og passordet du har valgt selv.'
      : 'Opprett konto med en godkjent e-postadresse. Du velger passordet selv.';
  }, [mode]);

  async function checkAccess() {
    const accessResponse = await fetch('/api/auth/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const accessJson = await accessResponse.json();
    if (!accessResponse.ok || !accessJson.allowed) {
      throw new Error(accessJson.error || 'Denne e-posten har ikke tilgang ennå.');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await checkAccess();
      const supabase = createBrowserSupabaseClient();

      if (mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Passordet må være minst 8 tegn.');
        }

        if (password !== confirmPassword) {
          throw new Error('Passordene er ikke like.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;
        setMessage('Konto opprettet. Hvis e-postbekreftelse er slått på i Supabase, må du bekrefte e-posten før du logger inn.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke logge inn.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="inline-flex rounded-full border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] p-1 text-xs uppercase tracking-[0.16em] text-[#d4c4b2]">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setMessage(null);
            setError(null);
          }}
          className={[
            'rounded-full px-4 py-2 transition',
            mode === 'login' ? 'bg-[rgba(183,146,104,0.16)] text-white' : 'text-[#b8aa98] hover:text-white',
          ].join(' ')}
        >
          Logg inn
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setMessage(null);
            setError(null);
          }}
          className={[
            'rounded-full px-4 py-2 transition',
            mode === 'signup' ? 'bg-[rgba(183,146,104,0.16)] text-white' : 'text-[#b8aa98] hover:text-white',
          ].join(' ')}
        >
          Opprett konto
        </button>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#8e7c69]">{helperText}</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#d4c4b2]">E-post</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-white outline-none placeholder:text-[#8e7c69]"
            placeholder="deg@firma.no"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#d4c4b2]">Passord</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            className="w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-white outline-none placeholder:text-[#8e7c69]"
            placeholder={mode === 'login' ? 'Ditt passord' : 'Minst 8 tegn'}
          />
        </div>

        {mode === 'signup' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-[#d4c4b2]">Gjenta passord</label>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
              className="w-full rounded-2xl border border-[rgba(220,194,163,0.14)] bg-[rgba(255,245,232,0.03)] px-4 py-3 text-white outline-none placeholder:text-[#8e7c69]"
              placeholder="Gjenta passord"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl border border-[rgba(183,146,104,0.32)] bg-[rgba(183,146,104,0.16)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[rgba(183,146,104,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Jobber…' : mode === 'login' ? 'Logg inn' : 'Opprett konto'}
        </button>
        {message ? <p className="text-sm text-[#dcbf9e]">{message}</p> : null}
        {error ? <p className="text-sm text-[#ffb8a8]">{error}</p> : null}
      </form>
    </div>
  );
}
