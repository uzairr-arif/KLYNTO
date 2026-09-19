import type { Target } from '../models';
import { isLocalhostHost, isPrivateHost, safeUrlParse } from '../../shared/utils';

/** Build a Target from a URL string. Returns null for unparseable input. */
export function buildTarget(rawUrl: string): Target | null {
  const url = safeUrlParse(rawUrl);
  if (!url) return null;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return {
    url: url.toString(),
    origin: url.origin,
    hostname: url.hostname.toLowerCase(),
    protocol: url.protocol.replace(':', ''),
    port: url.port || null,
    path: url.pathname + url.search,
  };
}

export function isLocalTarget(target: Target): boolean {
  return isLocalhostHost(target.hostname) || isPrivateHost(target.hostname);
}

/** True for pages Klynto can meaningfully inspect. */
export function isInspectableUrl(rawUrl: string): boolean {
  const url = safeUrlParse(rawUrl);
  if (!url) return false;
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function sameOrigin(a: string, b: string): boolean {
  const ua = safeUrlParse(a);
  const ub = safeUrlParse(b);
  if (!ua || !ub) return false;
  return ua.origin === ub.origin;
}
