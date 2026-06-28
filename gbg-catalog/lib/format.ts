const SIDE_LABELS: Record<string, string> = {
  LE: 'L',
  RI: 'R',
};

export function sideLabel(side: string | null): string {
  if (!side) return '';
  return SIDE_LABELS[side.trim().toUpperCase()] ?? '';
}

export function categoryLabel(
  categoryRaw: string,
  categoryDescBg: string | null,
  lid: string,
): string {
  return lid === '4' ? categoryRaw : categoryDescBg ?? categoryRaw;
}
