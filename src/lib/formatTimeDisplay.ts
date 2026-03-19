/** 24h time for UI, e.g. 10.00 (dot separator, Swedish convention). */
export function formatTimeDisplay(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}
