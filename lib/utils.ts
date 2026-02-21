import { startOfMonth, subDays, subMonths } from "date-fns";

function getPresetDates(preset: string): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "week":
      return { start: subDays(now, 7), end: now };
    case "month":
      return { start: startOfMonth(now), end: now };
    case "3mo":
      return { start: subMonths(now, 3), end: now };
    case "6mo":
      return { start: subMonths(now, 6), end: now };
    default:
      return { start: startOfMonth(now), end: now };
  }
}

export function getDateRangeFromParams(searchParams: {
  get: (key: string) => string | null;
}): { start: Date; end: Date } {
  const range = searchParams.get("range") ?? "month";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (start && end) {
    return { start: new Date(start), end: new Date(end) };
  }

  return getPresetDates(range);
}
