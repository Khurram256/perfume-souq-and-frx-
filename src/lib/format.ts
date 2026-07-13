export function formatPKR(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "Rs 0";
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}
