const BELOW_TWENTY = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underThousand(value: number): string {
  const parts: string[] = [];
  let remaining = value;
  if (remaining >= 100) {
    parts.push(`${BELOW_TWENTY[Math.floor(remaining / 100)]} hundred`);
    remaining %= 100;
  }
  if (remaining >= 20) {
    parts.push(TENS[Math.floor(remaining / 10)]);
    remaining %= 10;
  }
  if (remaining > 0) parts.push(BELOW_TWENTY[remaining]);
  return parts.join(" ");
}

export function amountInWordsEn(input: number): string {
  const value = Math.max(0, Math.floor(Number(input) || 0));
  if (value === 0) return "zero CFA francs";

  const scales: Array<[number, string]> = [
    [1_000_000_000_000_000, "quadrillion"],
    [1_000_000_000_000, "trillion"],
    [1_000_000_000, "billion"],
    [1_000_000, "million"],
    [1_000, "thousand"],
  ];
  const parts: string[] = [];
  let remaining = value;
  for (const [scale, label] of scales) {
    if (remaining >= scale) {
      parts.push(`${underThousand(Math.floor(remaining / scale))} ${label}`);
      remaining %= scale;
    }
  }
  if (remaining > 0) parts.push(underThousand(remaining));
  return `${parts.join(" ")} CFA franc${value === 1 ? "" : "s"}`;
}
