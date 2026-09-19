/** Format a timestamp relative to now, e.g. "just now", "5m ago", "Sep 15". */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** Parse a URL defensively; returns null instead of throwing. */
export function safeUrlParse(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isLocalhostHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '[::1]' || host === '::1' || host === '0.0.0.0') return true;
  // 127.0.0.0/8
  const match = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  return match !== null;
}

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isLocalhostHost(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map((p) => Number.parseInt(p, 10));
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

/** Best-effort registrable domain: last two labels. Not full PSL aware - used
 *  only for heuristic hints (e.g. broad cookie domains), never enforcement. */
export function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
}

/** Hosts strictly broader than the given hostname (e.g. a.example.com → example.com). */
export function parentDomains(hostname: string): string[] {
  const parts = hostname.toLowerCase().split('.');
  const parents: string[] = [];
  for (let i = 1; i < parts.length - 1; i++) {
    parents.push(parts.slice(i).join('.'));
  }
  return parents;
}

/** Permission origin patterns covering both schemes for a host. */
export function originPatternsForHost(hostname: string): string[] {
  return [`http://${hostname}/*`, `https://${hostname}/*`];
}

/** Reverse of originPatternsForHost - extract the host from a permission pattern. */
export function hostFromOriginPattern(pattern: string): string | null {
  const m = /^(https?|\*):\/\/([^/]+)\/\*?$/.exec(pattern);
  if (!m) return null;
  const host = m[2];
  if (host === '*' || host.startsWith('*.')) return null;
  return host.toLowerCase();
}

export function originFromUrl(raw: string): string | null {
  const url = safeUrlParse(raw);
  return url ? url.origin : null;
}

export function normalizedHost(raw: string): string {
  const url = safeUrlParse(raw);
  return url ? url.hostname.toLowerCase() : raw.toLowerCase();
}
