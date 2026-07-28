import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates student course based on group name and academic year.
 * Group names typically contain a digit representing the entry year last digit.
 */
export function getStudentCourse(groupName: string, academicYear: string) {
  const match = groupName.match(/\d/);
  if (!match) return null;
  const firstDigit = parseInt(match[0]);
  
  const startYear = parseInt(academicYear.split("-")[0]);
  if (isNaN(startYear)) return null;

  let entryYear = Math.floor(startYear / 10) * 10 + firstDigit;
  if (entryYear > startYear) entryYear -= 10;
  
  const course = startYear - entryYear + 1;
  return course > 0 && course <= 6 ? course : null;
}

export function shortName(full: string): string {
  const [last, first, patronymic] = full.trim().split(/\s+/);
  if (!last) return full;
  if (!first) return last;
  return `${last} ${first[0]}.${patronymic ? `${patronymic[0]}.` : ""}`;
}

export function formatSemesterName(semester: { name: string; year: string }, groupName?: string) {
  if (!groupName) return semester.name;
  const course = getStudentCourse(groupName, semester.year);
  if (!course) return semester.name;
  
  const semNumMatch = semester.name.match(/^\d/);
  const semNum = semNumMatch ? semNumMatch[0] : "";
  
  return course + " курс, " + semNum + " семестр (" + semester.year + ")";
}