export function getAcademicYear(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
