function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAllowedBetaEmails() {
  const raw = process.env.ALLOWED_BETA_EMAILS || '';
  return raw
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean)
    .slice(0, 4);
}

export function isAllowedBetaEmail(email?: string | null) {
  if (!email) return false;
  const allowed = getAllowedBetaEmails();
  if (!allowed.length) return true;
  return allowed.includes(normalizeEmail(email));
}
