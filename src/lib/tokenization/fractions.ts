function toCents(value: number) {
  return Math.round(value * 100);
}

export function splitInvoiceIntoFractions(total: number, count: number) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('La cantidad de fracciones debe ser un entero positivo.');
  }

  const totalCents = toCents(total);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  const fractions = Array.from({ length: count }, (_, index) => (index === count - 1 ? base + remainder : base));

  return fractions.map((value) => Number((value / 100).toFixed(2)));
}
