// utils/amountFormatter.ts

/**
 * Safely convert any value to number
 */
export const toNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const accountingNumber = (value: number, format: () => string): string => {
  const formatted = format();
  return value < 0 ? `(${formatted.replace(/^-/, "")})` : formatted;
};

/**
 * Format number with fixed decimals
 * Example: 1000 -> 1000.00
 */
export const toFixedAmount = (value: any, digits = 2): string => {
  const number = toNumber(value);
  return accountingNumber(number, () => number.toFixed(digits));
};

/**
 * Format number with comma separators
 * Example: 1000000 -> 1,000,000
 */
export const formatNumber = (
  value: any,
  options?: Intl.NumberFormatOptions,
): string => {
  const number = toNumber(value);
  return accountingNumber(number, () => number.toLocaleString(undefined, options));
};

/**
 * Format amount with decimals + commas
 * Example: 1000000 -> 1,000,000.00
 */
export const formatAmount = (value: any, digits = 2): string => {
  const number = toNumber(value);
  return accountingNumber(number, () => number.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }));
};

/**
 * Format currency with symbol
 * Example: ৳ 1,000.00
 */
export const formatCurrency = (
  value: any,
  symbol = "৳",
  digits = 2,
): string => {
  return `${symbol} ${formatAmount(value, digits)}`;
};

/**
 * Compact format (K, M, B)
 * Example: 1200 -> 1.2K
 */
export const formatCompact = (value: any): string => {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toNumber(value));
};

/**
 * Remove decimals (integer format)
 */
export const formatInteger = (value: any): string => {
  const number = Math.floor(toNumber(value));
  return accountingNumber(number, () => number.toLocaleString());
};

/**
 * Percentage formatter
 * Example: 0.25 -> 25%
 */
export const formatPercentage = (value: any, digits = 2): string => {
  return `${(toNumber(value) * 100).toFixed(digits)}%`;
};
