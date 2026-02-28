import { format, parse, addMonths, subMonths } from "date-fns";

export function getSafeCurrentMonthString(): string {
  return format(new Date(), "yyyy-MM");
}

export function getPreviousMonth(monthStr: string): string {
  const date = parse(monthStr, "yyyy-MM", new Date());
  return format(subMonths(date, 1), "yyyy-MM");
}

export function getNextMonth(monthStr: string): string {
  const date = parse(monthStr, "yyyy-MM", new Date());
  return format(addMonths(date, 1), "yyyy-MM");
}

export function formatDateString(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd.MM.yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTimeString(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd.MM.yyyy HH:mm");
  } catch {
    return dateStr;
  }
}
