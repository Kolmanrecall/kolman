'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-transparent px-4 py-2 text-sm text-[#b4a390] transition hover:border-[rgba(220,194,163,0.10)] hover:bg-[rgba(255,245,232,0.03)] hover:text-white"
    >
      Logg ut
    </button>
  );
}
