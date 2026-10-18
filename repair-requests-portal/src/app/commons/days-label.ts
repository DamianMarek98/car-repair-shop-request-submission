/** "1 dzień", "5 dni", "-2 dni" - the only plural form leave counts need. */
export function daysLabel(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'dzień' : 'dni'}`;
}
