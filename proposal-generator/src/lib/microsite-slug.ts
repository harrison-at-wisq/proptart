/**
 * Generate a URL-safe slug for a microsite from a company name.
 * Format: lowercase-company-name-6charRandom
 * e.g. "acme-corp-a3f7x2"
 */
export function generateMicrositeSlug(companyName: string): string {
  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);

  const suffix = randomSuffix(6);
  return base ? `${base}-${suffix}` : suffix;
}

function randomSuffix(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
