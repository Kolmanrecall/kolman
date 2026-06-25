import { requireApiUser } from '@/lib/auth-user';
import { createServiceRoleSupabaseClient } from '@/lib/supabase-server';

type Row = Record<string, unknown>;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function text(value: unknown) {
  return escapeHtml(value || '—');
}

function section(title: string, count: number, body: string) {
  return `
    <section class="section">
      <div class="section-header">
        <h2>${escapeHtml(title)}</h2>
        <span>${count}</span>
      </div>
      ${body}
    </section>
  `;
}

function emptyState(label: string) {
  return `<p class="empty">Ingen ${escapeHtml(label.toLowerCase())} registrert.</p>`;
}

function contactsTable(rows: Row[]) {
  if (!rows.length) return emptyState('kontakter');

  return `
    <table>
      <thead>
        <tr>
          <th>Navn</th>
          <th>E-post</th>
          <th>Telefon</th>
          <th>By</th>
          <th>Status</th>
          <th>Siste kontakt</th>
          <th>Notater</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (contact: Row) => `
              <tr>
                <td>${text(contact.full_name)}</td>
                <td>${text(contact.email)}</td>
                <td>${text(contact.phone)}</td>
                <td>${text(contact.city)}</td>
                <td>${text(contact.status_raw)}</td>
                <td>${text(formatDate(contact.last_contacted_at))}</td>
                <td>${text(contact.notes)}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function followUpsTable(rows: Row[], contactsById: Map<string, Row>) {
  if (!rows.length) return emptyState('oppfølginger');

  return `
    <table>
      <thead>
        <tr>
          <th>Kontakt</th>
          <th>Tittel</th>
          <th>Dato</th>
          <th>Status</th>
          <th>Notat</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((followUp: Row) => {
            const contact = contactsById.get(String(followUp.contact_id));
            return `
              <tr>
                <td>${text(contact?.full_name)}</td>
                <td>${text(followUp.title)}</td>
                <td>${text(followUp.due_date)}</td>
                <td>${text(followUp.status)}</td>
                <td>${text(followUp.note)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function activitiesTable(rows: Row[], contactsById: Map<string, Row>) {
  if (!rows.length) return emptyState('historikk');

  return `
    <table>
      <thead>
        <tr>
          <th>Tidspunkt</th>
          <th>Kontakt</th>
          <th>Type</th>
          <th>Innhold</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((activity: Row) => {
            const contact = contactsById.get(String(activity.contact_id));
            return `
              <tr>
                <td>${text(formatDate(activity.created_at))}</td>
                <td>${text(contact?.full_name)}</td>
                <td>${text(activity.activity_type)}</td>
                <td>${text(activity.body)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function messageDraftsTable(rows: Row[], contactsById: Map<string, Row>) {
  if (!rows.length) return emptyState('meldingsutkast');

  return `
    <table>
      <thead>
        <tr>
          <th>Kontakt</th>
          <th>Kanal</th>
          <th>Formål</th>
          <th>Status</th>
          <th>Melding</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((draft: Row) => {
            const contact = contactsById.get(String(draft.contact_id));
            const status = draft.sent ? 'Sendt' : draft.approved ? 'Godkjent' : 'Utkast';
            return `
              <tr>
                <td>${text(contact?.full_name)}</td>
                <td>${text(draft.channel)}</td>
                <td>${text(draft.intent)}</td>
                <td>${text(status)}</td>
                <td>${text(draft.message_text)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `;
}

function simpleRowsTable(title: string, rows: Row[], contactsById: Map<string, Row>) {
  if (!rows.length) return section(title, 0, emptyState(title));

  const keys = Object.keys(rows[0] ?? {}).filter((key) => !['id', 'user_id'].includes(key));
  return section(
    title,
    rows.length,
    `
      <table>
        <thead>
          <tr>${keys.map((key: string) => `<th>${escapeHtml(key)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row: Row) => `
                <tr>
                  ${keys
                    .map((key: string) => {
                      if (key === 'contact_id') {
                        const contact = contactsById.get(String(row[key]));
                        return `<td>${text(contact?.full_name)}</td>`;
                      }
                      return `<td>${text(key.endsWith('_at') ? formatDate(row[key]) : row[key])}</td>`;
                    })
                    .join('')}
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    `,
  );
}

function buildHtmlReport(params: {
  exportedAt: string;
  profile: Row | null;
  contacts: Row[];
  followUps: Row[];
  activities: Row[];
  drafts: Row[];
  classifications: Row[];
  replies: Row[];
}) {
  const { exportedAt, profile, contacts, followUps, activities, drafts, classifications, replies } = params;
  const contactsById = new Map<string, Row>(contacts.map((contact: Row) => [String(contact.id), contact]));

  return `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kolman Eiendom – Dataeksport</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      background: #f5f0e8;
      color: #17120e;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    .page { max-width: 1180px; margin: 0 auto; padding: 48px 28px 72px; }
    .hero {
      border: 1px solid rgba(80, 57, 38, 0.16);
      border-radius: 32px;
      background: #fffaf3;
      padding: 34px;
      box-shadow: 0 20px 60px rgba(34, 22, 12, 0.08);
    }
    .eyebrow { margin: 0 0 10px; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: #8a6a47; font-weight: 700; }
    h1 { margin: 0; font-size: 34px; letter-spacing: -0.04em; }
    .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
    .meta-card { border: 1px solid rgba(80, 57, 38, 0.12); border-radius: 20px; padding: 16px; background: rgba(255,255,255,.52); }
    .label { margin: 0 0 5px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #8a6a47; font-weight: 700; }
    .value { margin: 0; font-size: 15px; font-weight: 650; }
    .section { margin-top: 26px; border: 1px solid rgba(80, 57, 38, 0.14); border-radius: 28px; background: #fffaf3; overflow: hidden; }
    .section-header { display:flex; justify-content:space-between; align-items:center; gap: 16px; padding: 22px 24px; border-bottom: 1px solid rgba(80, 57, 38, 0.10); }
    h2 { margin: 0; font-size: 20px; letter-spacing: -0.02em; }
    .section-header span { border-radius: 999px; padding: 7px 12px; background: #eee3d4; color: #6e5335; font-size: 12px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 13px 16px; color: #7b6040; background: #f1e7d8; font-size: 11px; text-transform: uppercase; letter-spacing: .10em; }
    td { vertical-align: top; padding: 14px 16px; border-top: 1px solid rgba(80, 57, 38, 0.08); max-width: 360px; white-space: pre-wrap; word-break: break-word; }
    tr:nth-child(even) td { background: rgba(80, 57, 38, 0.025); }
    .empty { margin: 0; padding: 22px 24px; color: #806b55; }
    .footer { margin-top: 26px; color: #806b55; font-size: 12px; }
    @media print { body { background: white; } .page { padding: 24px; } .hero, .section { box-shadow: none; break-inside: avoid; } }
    @media (max-width: 820px) { .meta { grid-template-columns: 1fr; } .page { padding: 24px 14px; } .hero { padding: 24px; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">Kolman Eiendom</p>
      <h1>Dataeksport</h1>
      <div class="meta">
        <div class="meta-card">
          <p class="label">Konto</p>
          <p class="value">${text(profile?.email)}</p>
        </div>
        <div class="meta-card">
          <p class="label">Navn</p>
          <p class="value">${text(profile?.name)}</p>
        </div>
        <div class="meta-card">
          <p class="label">Eksportert</p>
          <p class="value">${text(formatDate(exportedAt))}</p>
        </div>
      </div>
    </header>

    ${section('Kontakter', contacts.length, contactsTable(contacts))}
    ${section('Oppfølginger', followUps.length, followUpsTable(followUps, contactsById))}
    ${section('Historikk', activities.length, activitiesTable(activities, contactsById))}
    ${section('Meldingsutkast', drafts.length, messageDraftsTable(drafts, contactsById))}
    ${simpleRowsTable('Klassifiseringer', classifications, contactsById)}
    ${simpleRowsTable('Svaranalyse', replies, contactsById)}

    <p class="footer">Dette er en lesbar eksport fra Kolman Eiendom. Filen kan åpnes i nettleser, lagres eller skrives ut som PDF.</p>
  </main>
</body>
</html>`;
}

export async function GET() {
  const { user, errorResponse } = await requireApiUser();
  if (!user) return errorResponse!;

  try {
    const supabase = createServiceRoleSupabaseClient();

    const [
      { data: profile },
      { data: contacts, error: contactsError },
      { data: followUps, error: followUpsError },
      { data: activities, error: activitiesError },
      { data: drafts, error: draftsError },
    ] = await Promise.all([
      supabase.from('users').select('id, name, email, company_name, created_at').eq('id', user.id).maybeSingle(),
      supabase.from('contacts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('contact_activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('message_drafts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (contactsError) throw contactsError;
    if (followUpsError) throw followUpsError;
    if (activitiesError) throw activitiesError;
    if (draftsError) throw draftsError;

    const contactRows = (contacts ?? []) as Row[];
    const contactIds = contactRows.map((contact: Row) => String(contact.id));

    const classificationsResult = contactIds.length
      ? await supabase.from('contact_classifications').select('*').in('contact_id', contactIds).order('created_at', { ascending: false })
      : { data: [], error: null };

    const repliesResult = contactIds.length
      ? await supabase.from('contact_replies').select('*').in('contact_id', contactIds).order('created_at', { ascending: false })
      : { data: [], error: null };

    if (classificationsResult.error) throw classificationsResult.error;
    if (repliesResult.error) throw repliesResult.error;

    const exportedAt = new Date().toISOString();
    const html = buildHtmlReport({
      exportedAt,
      profile: (profile ?? { id: user.id, email: user.email }) as Row,
      contacts: contactRows,
      followUps: (followUps ?? []) as Row[],
      activities: (activities ?? []) as Row[],
      drafts: (drafts ?? []) as Row[],
      classifications: (classificationsResult.data ?? []) as Row[],
      replies: (repliesResult.data ?? []) as Row[],
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="kolman-rapport-${exportedAt.slice(0, 10)}.html"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Kunne ikke eksportere data.' },
      { status: 500 },
    );
  }
}
