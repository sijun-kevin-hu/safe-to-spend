const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
});

export const formatCurrency = (amount: number) => currencyFormatter.format(amount);

// Bill dates are calendar dates, not UTC timestamps.
export function formatBillDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function toDateOnly(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")].join("-");
}
