export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="kolman-card p-6 md:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#b8aa98]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
