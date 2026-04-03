import { BrandMark } from '@/components/brand-mark';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0807] px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 kolman-grid opacity-20" />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[36px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] p-8 md:p-12">
            <BrandMark />
            <div className="mt-12 max-w-xl">
              <p className="text-sm uppercase tracking-[0.24em] text-[#c6a884]">Kolman</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Et arbeidsverktøy for meglere som vil få mer ut av gamle leads og tidligere kunder.
              </h1>
              <p className="mt-5 text-base leading-7 text-[#d4c4b2] md:text-lg">
                Logg inn for å jobbe med egne kontakter, notater, relasjoner og oppfølging i én ren arbeidsflate.
              </p>
            </div>
          </div>

          <div className="rounded-[36px] border border-[rgba(220,194,163,0.10)] bg-[rgba(255,245,232,0.03)] p-8 shadow-sm md:p-10">
            <div className="inline-block rounded-full border border-[rgba(183,146,104,0.18)] bg-[rgba(183,146,104,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#dcbf9e]">
              Inviterte brukere
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">Logg inn i Kolman</h2>
            <p className="mt-2 text-sm leading-6 text-[#8e7c69]">
              Tilgang åpnes kun for godkjente e-postadresser. Hver megler ser bare sine egne data.
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
