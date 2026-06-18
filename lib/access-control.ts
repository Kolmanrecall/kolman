function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAllowedAccessEmails() {
  const raw = process.env.ALLOWED_ACCESS_EMAILS || process.env.ALLOWED_BETA_EMAILS || '';
  return raw
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function isAllowedAccessEmail(email?: string | null) {
  if (!email) return false;
  const allowed = getAllowedAccessEmails();
  if (!allowed.length) return true;
  return allowed.includes(normalizeEmail(email));
}
