/** Todas las fechas "ISO" en este módulo son cadenas YYYY-MM-DD (comparables lexicográficamente). */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, delta: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function isFuture(isoDate: string): boolean {
  return isoDate > todayIso();
}

/** YYYY-MM-DD -> dd-mm-aaaa */
export function toSlug(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
}

/** dd-mm-aaaa -> YYYY-MM-DD, o null si el slug no tiene ese formato */
export function slugToIso(slug: string): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(slug);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/** Día del año (1-365). El 29 de febrero se aplana al 365 para calzar con colecciones de 365 entradas. */
export function dayOfYear(isoDate: string = todayIso()): number {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Math.floor((date.getTime() - start) / 86_400_000) + 1;
  return Math.min(day, 365);
}
