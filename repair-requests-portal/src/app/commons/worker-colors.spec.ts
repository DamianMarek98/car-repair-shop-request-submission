import { colorFor, WORKER_COLORS } from './worker-colors';

describe('worker-colors', () => {
  it('has 15 distinct backgrounds and text colours', () => {
    expect(WORKER_COLORS.length).toBe(15);
    expect(new Set(WORKER_COLORS.map(c => c.background)).size).toBe(15);
    expect(new Set(WORKER_COLORS.map(c => c.text)).size).toBe(15);
  });

  it('wraps around past the palette and tolerates bad input', () => {
    expect(colorFor(15)).toBe(WORKER_COLORS[0]);
    expect(colorFor(16)).toBe(WORKER_COLORS[1]);
    expect(colorFor(-1)).toBe(WORKER_COLORS[14]);
    expect(colorFor(undefined)).toBe(WORKER_COLORS[0]);
  });
});
