import type { CurrencyCode, Lang } from "./types";

const INDIAN = new Set<CurrencyCode>(["INR"]);

export function currencySymbol(currency: CurrencyCode, lang: Lang): string {
  if (currency === "LKR") {
    if (lang === "si") return "රු.";
    if (lang === "ta") return "Rs.";
    return "Rs";
  }
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "INR") return "₹";
  return "£";
}

function groupDigits(digits: string, indian: boolean): string {
  if (!indian) return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${digits.slice(-3)}`;
}

export function formatMoney(cents: number, currency: CurrencyCode, lang: Lang): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const indian = INDIAN.has(currency) || (currency === "LKR" && lang === "ta");
  const body = `${currencySymbol(currency, lang)} ${groupDigits(String(whole), indian)}.${frac}`;
  return negative ? `−${body}` : body;
}

export function parseMoney(raw: string, allowZero = false): number | null {
  const cleaned = raw
    .trim()
    .replace(/රු\.?/g, "")
    .replace(/rs\.?/gi, "")
    .replace(/[,$€£₹\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isFinite(cents)) return null;
  if (cents > 100_000_000_000) return null;
  if (cents < 0) return null;
  if (!allowZero && cents === 0) return null;
  return cents;
}

export function centsToInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

export function effect(type: "income" | "expense", cents: number): number {
  return type === "income" ? cents : -cents;
}
