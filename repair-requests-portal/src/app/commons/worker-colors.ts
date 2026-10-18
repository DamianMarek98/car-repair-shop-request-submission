/**
 * Worker bar colours (plan §5.1): pastel background + dark text, ordered so neighbouring indices are far
 * apart in hue. The backend stores only `colorIndex` (lowest free index on create). Brand red is left
 * out - the portal uses it for "today" and errors.
 */
export interface WorkerColor {
  name: string;
  background: string;
  text: string;
}

export const WORKER_COLORS: WorkerColor[] = [
  { name: 'blue', background: '#bfdbfe', text: '#1e40af' },
  { name: 'orange', background: '#fed7aa', text: '#9a3412' },
  { name: 'green', background: '#bbf7d0', text: '#166534' },
  { name: 'fuchsia', background: '#f5d0fe', text: '#86198f' },
  { name: 'yellow', background: '#fef08a', text: '#854d0e' },
  { name: 'teal', background: '#99f6e4', text: '#115e59' },
  { name: 'rose', background: '#fecdd3', text: '#9f1239' },
  { name: 'violet', background: '#ddd6fe', text: '#5b21b6' },
  { name: 'lime', background: '#d9f99d', text: '#3f6212' },
  { name: 'cyan', background: '#a5f3fc', text: '#155e75' },
  { name: 'amber', background: '#fde68a', text: '#92400e' },
  { name: 'pink', background: '#fbcfe8', text: '#9d174d' },
  { name: 'emerald', background: '#a7f3d0', text: '#065f46' },
  { name: 'indigo', background: '#c7d2fe', text: '#3730a3' },
  { name: 'stone', background: '#d6d3d1', text: '#292524' },
];

/** Wraps around past 15 workers (not expected) and tolerates bad input. */
export function colorFor(index: number | null | undefined): WorkerColor {
  const size = WORKER_COLORS.length;
  const safe = Number.isInteger(index) ? (index as number) : 0;
  return WORKER_COLORS[((safe % size) + size) % size];
}
