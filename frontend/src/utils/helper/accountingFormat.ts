export type AccountingFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  zeroAsDash?: boolean;
};

/** Format amounts using standard accounting notation. */
export const formatAccounting = (
  value: unknown,
  options: AccountingFormatOptions = {},
) => {
  const amount = Number(value ?? 0);
  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  if (!Number.isFinite(amount)) return "0.00";
  if (options.zeroAsDash && amount === 0) return "-";

  const absolute = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return amount < 0 ? "(" + absolute + ")" : absolute;
};

/** Format an amount together with its debit/credit side for accounting reports. */
export const formatWithDrCr = (
  value: unknown,
  side?: "Dr" | "Cr",
) => {
  const amount = Number(value ?? 0);
  const resolvedSide = side ?? (amount < 0 ? "Cr" : "Dr");
  return `${formatAccounting(amount)} ${resolvedSide}`;
};

export default formatAccounting;
