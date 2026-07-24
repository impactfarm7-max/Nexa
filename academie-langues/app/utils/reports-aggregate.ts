export function sum(nums: number[]) {
  return nums.reduce((s, n) => s + (Number(n) || 0), 0);
}

export function roundPct(num: number, den: number) {
  if (!den || den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

export function groupCount<T>(
  rows: T[],
  keyFn: (row: T) => string,
  labelFn?: (row: T) => string,
) {
  const map = new Map<string, { key: string; label: string; count: number }>();
  for (const row of rows) {
    const key = keyFn(row);
    const label = labelFn ? labelFn(row) : key;
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { key, label, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function groupSum<T>(
  rows: T[],
  keyFn: (row: T) => string,
  labelFn: (row: T) => string,
  amountFn: (row: T) => number,
) {
  const map = new Map<string, { key: string; label: string; amount: number; count: number }>();
  for (const row of rows) {
    const key = keyFn(row);
    const label = labelFn(row);
    const amount = Number(amountFn(row)) || 0;
    const cur = map.get(key);
    if (cur) {
      cur.amount += amount;
      cur.count += 1;
    } else {
      map.set(key, { key, label, amount, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
