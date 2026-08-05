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

/**
 * Día del año (1-365), estable entre años bisiestos y no bisiestos.
 * Se calcula mes/día contra un año de referencia no bisiesto, así que el 29 de
 * febrero reutiliza el número del 28 y el resto del calendario no se corre
 * (evita que el 30 y 31 de diciembre terminen mostrando la misma entrada).
 */
export function dayOfYear(isoDate: string = todayIso()): number {
  const [, monthStr, dayStr] = isoDate.split("-");
  const month = Number(monthStr);
  const day = month === 2 && dayStr === "29" ? 28 : Number(dayStr);

  const REFERENCE_YEAR = 2001;
  const start = Date.UTC(REFERENCE_YEAR, 0, 1);
  const current = Date.UTC(REFERENCE_YEAR, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}
