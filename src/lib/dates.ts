// Simple date helpers to treat dates in America/Santo_Domingo (Dominican Republic)
export function toISOFromDateInput(dateStr: string) {
  // Append noon to avoid timezone shift crossing day boundary
  // e.g. '2025-09-26' -> '2025-09-26T12:00:00' then toISOString -> keeps same calendar date in most zones
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toISOString();
}

export function formatDateTz(d: string | Date | undefined) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' });
}

export function inputDateFromStored(d: string | Date | undefined) {
  if (!d) return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
  return dt.toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' });
}
