import numberToWords from "number-to-words";

const chunkToWords = (value: number) =>
  numberToWords
    .toWords(value)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Converts an amount to English words using the Bangladeshi/South Asian
 * numbering system (Lakh/Crore) instead of Million/Billion.
 */
export const numberToBangladeshiCurrencyWords = (value: unknown) => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return "Zero Taka Only";

  const absoluteValue = Math.abs(numericValue);
  let wholeTaka = Math.floor(absoluteValue);
  let paisa = Math.round((absoluteValue - wholeTaka) * 100);

  if (paisa === 100) {
    wholeTaka += 1;
    paisa = 0;
  }

  const groups = [
    { value: 10_000_000, label: "Crore" },
    { value: 100_000, label: "Lakh" },
    { value: 1_000, label: "Thousand" },
    { value: 100, label: "Hundred" },
  ];

  const parts: string[] = [];
  let remainder = wholeTaka;

  for (const group of groups) {
    if (remainder >= group.value) {
      const count = Math.floor(remainder / group.value);
      parts.push(`${chunkToWords(count)} ${group.label}`);
      remainder %= group.value;
    }
  }

  if (remainder > 0) parts.push(chunkToWords(remainder));
  if (!parts.length) parts.push("zero");

  const amountWords = parts.join(" ").replace(/^\w/, (letter) => letter.toUpperCase());
  const sign = numericValue < 0 ? "Minus " : "";
  const paisaWords = paisa > 0 ? ` And ${chunkToWords(paisa)} Paisa` : "";

  return `${sign}${amountWords} Taka${paisaWords} Only`;
};

export default numberToBangladeshiCurrencyWords;

