const SIDE_LABELS: Record<string, string> = {
  LE: 'L',
  RI: 'R',
};

export function sideLabel(side: string | null): string {
  if (!side) return '';
  return SIDE_LABELS[side.trim().toUpperCase()] ?? '';
}
