import { format } from "date-fns";

export function formatDate(date: Date | number | string, formatStr = "dd MMM yyyy") {
  return format(new Date(date), formatStr);
}
