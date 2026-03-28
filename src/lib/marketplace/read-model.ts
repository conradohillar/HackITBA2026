import { calculatePerFractionExpectedReturn } from '@/lib/marketplace/calculations';
import type { InvoiceFundingSnapshot, MarketplaceInvoiceCard } from '@/lib/marketplace/types';

export type MarketplaceInvoiceRow = {
  id: string;
  status: string;
  invoice_number: string;
  pagador_name: string;
  pagador_cuit: string;
  amount: number | string | null;
  net_amount: number | string | null;
  risk_tier: string | null;
  discount_rate: number | string | null;
  total_fractions: number | null;
  funded_fractions: number | null;
  due_date: string;
};

export type FractionRow = {
  id: string;
  net_amount: number | string;
};

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isFundingReadyStatus(status: string) {
  return status === 'funding' || status === 'funded';
}

function daysToMaturity(dueDate: string) {
  const start = new Date();
  const end = new Date(`${dueDate}T00:00:00Z`);
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

export function toMarketplaceInvoiceCard(row: MarketplaceInvoiceRow): MarketplaceInvoiceCard | null {
  if (!isFundingReadyStatus(row.status) || !row.risk_tier) {
    return null;
  }

  const totalFractions = row.total_fractions ?? 0;
  const fundedFractions = row.funded_fractions ?? 0;
  const netAmount = toNumber(row.net_amount);
  const amount = toNumber(row.amount);
  const perFractionNetAmount = totalFractions > 0 ? roundToCents(netAmount / totalFractions) : 0;
  const progressPercentage = totalFractions > 0 ? roundToCents((fundedFractions / totalFractions) * 100) : 0;

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    pagadorName: row.pagador_name,
    payerCuit: row.pagador_cuit,
    amount,
    netAmount,
    riskTier: row.risk_tier as MarketplaceInvoiceCard['riskTier'],
    discountRate: toNumber(row.discount_rate),
    totalFractions,
    fundedFractions,
    availableFractions: Math.max(totalFractions - fundedFractions, 0),
    daysToMaturity: daysToMaturity(row.due_date),
    perFractionNetAmount,
    perFractionExpectedReturn: calculatePerFractionExpectedReturn({
      fractionNetAmount: perFractionNetAmount,
      invoiceNetAmount: netAmount,
      invoiceAmount: amount,
    }),
    progressPercentage,
    dueDate: row.due_date,
  };
}

export function buildInvoiceFundingSnapshot(
  row: MarketplaceInvoiceRow,
  availableFractions: FractionRow[],
): InvoiceFundingSnapshot | null {
  const card = toMarketplaceInvoiceCard(row);

  if (!card) {
    return null;
  }

  const perFractionNetAmount =
    availableFractions.length > 0
      ? toNumber(availableFractions[0]?.net_amount)
      : card.totalFractions > 0
        ? roundToCents(card.netAmount / card.totalFractions)
        : 0;

  return {
    ...card,
    availableFractions: availableFractions.length,
    availableFractionIds: availableFractions.map((fraction) => fraction.id),
    perFractionNetAmount,
    perFractionExpectedReturn: calculatePerFractionExpectedReturn({
      fractionNetAmount: perFractionNetAmount,
      invoiceNetAmount: card.netAmount,
      invoiceAmount: card.amount,
    }),
    progressPercentage: card.totalFractions > 0 ? roundToCents(((card.totalFractions - availableFractions.length) / card.totalFractions) * 100) : 0,
  } satisfies InvoiceFundingSnapshot;
}
