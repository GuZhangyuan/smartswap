import { TOKEN_PRICES_USD } from "./constants.ts";
import type { TokenSymbol } from "./types.ts";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

export function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function toTokenUnits(amount: string, decimals: number) {
  const [whole = "0", fraction = ""] = amount.trim().split(".");
  const padded = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return `${BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0")}`;
}

export function fromTokenUnits(amount: string, decimals: number, precision = 6) {
  const raw = BigInt(amount || "0");
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;
  const trimmed = fraction.toString().padStart(decimals, "0").slice(0, precision);
  return Number(`${whole}.${trimmed || "0"}`).toFixed(precision).replace(/\.?0+$/, "");
}

export function estimateUsdAmount(amount: string, token: TokenSymbol) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  return numeric * TOKEN_PRICES_USD[token];
}
