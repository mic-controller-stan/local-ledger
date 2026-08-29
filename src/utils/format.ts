import { format, parseISO } from "date-fns";

export const money = (value: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);
  } catch {
    // Fall back to USD if an unknown currency code slips through.
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
  }
};

export const shortDate = (iso: string) => {
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return iso;
  }
};
