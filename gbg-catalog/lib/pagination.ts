export function parsePage(raw: string | undefined): number {
  const n = Math.floor(Number(raw ?? '1'));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
