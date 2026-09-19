import type { HttpHeader } from '../models';

/** Case-insensitive multi-value header collection. */
export class HttpHeaders {
  private readonly map = new Map<string, string[]>();
  private readonly displayNames = new Map<string, string>();

  constructor(headers: HttpHeader[] = []) {
    for (const header of headers) {
      this.add(header.name, header.value);
    }
  }

  add(name: string, value: string): void {
    const key = name.toLowerCase();
    const list = this.map.get(key);
    if (list) {
      list.push(value);
    } else {
      this.map.set(key, [value]);
      this.displayNames.set(key, name);
    }
  }

  /** First value or null. */
  get(name: string): string | null {
    const list = this.map.get(name.toLowerCase());
    return list && list.length > 0 ? list[0] : null;
  }

  /** All values (headers like Set-Cookie can repeat). */
  getAll(name: string): string[] {
    return this.map.get(name.toLowerCase()) ?? [];
  }

  has(name: string): boolean {
    return this.map.has(name.toLowerCase());
  }

  /** Combined value (joined with ", ") or null. */
  getCombined(name: string): string | null {
    const list = this.getAll(name);
    return list.length > 0 ? list.join(', ') : null;
  }

  names(): string[] {
    return [...this.map.keys()];
  }

  /** Original list order preserved (for display). */
  toList(): HttpHeader[] {
    const list: HttpHeader[] = [];
    for (const [key, values] of this.map) {
      const name = this.displayNames.get(key) ?? key;
      for (const value of values) {
        list.push({ name, value });
      }
    }
    return list;
  }
}

export function parseHeaders(headers: HttpHeader[]): HttpHeaders {
  return new HttpHeaders(headers);
}

/** Parse "Name: value" lines - handy for fixtures and manual input. */
export function parseHeaderLines(raw: string): HttpHeader[] {
  const headers: HttpHeader[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) continue;
    headers.push({
      name: trimmed.slice(0, colon).trim(),
      value: trimmed.slice(colon + 1).trim(),
    });
  }
  return headers;
}
