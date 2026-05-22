import type { CurrencyMode } from "@/types/app";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function calculateBillableArea(area: number) {
  if (!area || Number.isNaN(area) || area <= 0) return 0;
  if (area <= 0.5) return 0.5;
  if (area <= 1) return 1;
  return Number(area.toFixed(2));
}

export function calculateItemPrice(
  width: number,
  height: number,
  pricePerSqm: number,
  quantity = 1,
) {
  const rawArea = Number((width * height * quantity).toFixed(4));
  const billableArea = calculateBillableArea(rawArea);
  const price = Number((billableArea * pricePerSqm).toFixed(2));
  return { rawArea, billableArea, price };
}

export function formatMoney(
  value: number,
  currency: CurrencyMode = "USD",
  exchangeRate = 12800,
) {
  if (currency === "UZS") {
    const uzs = value * exchangeRate;
    return `${uzs.toLocaleString("uz-UZ", { maximumFractionDigits: 0 })} so'm`;
  }
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
