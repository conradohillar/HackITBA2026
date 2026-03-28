export type TimelineItem = {
  id: string;
  at: string;
  kind: 'status' | 'financial';
  label: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

type EventRow = {
  id: string | number;
  created_at: string;
  event_type: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type TransactionRow = {
  id: string;
  created_at: string;
  type: string;
  amount: number | string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

type BuildTimelineInput = {
  invoiceEvents: EventRow[];
  fractionEvents: EventRow[];
  transactions: TransactionRow[];
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function buildEventLabel(event: EventRow) {
  if (event.event_type === 'invoice.transitioned') {
    const status = getString(event.new_data?.status);
    return {
      label: `Factura pasó a ${status ?? 'estado desconocido'}`,
      metadata: status ? { status } : undefined,
    };
  }

  if (event.event_type === 'fraction.purchased') {
    const fractionIndex = Number(event.metadata?.fraction_index ?? event.new_data?.fraction_index ?? 0);
    const investorId = getString(event.new_data?.investor_id);

    return {
      label: `Fracción ${fractionIndex || '?'} comprada`,
      metadata: {
        ...(fractionIndex ? { fractionIndex } : {}),
        ...(investorId ? { investorId } : {}),
      },
    };
  }

  return {
    label: event.event_type,
    metadata: event.metadata ?? undefined,
  };
}

function buildTransactionLabel(type: string) {
  switch (type) {
    case 'fraction_purchase':
      return 'Compra de fracción';
    case 'disbursement_to_cedente':
      return 'Desembolso al cedente';
    case 'settlement_payment':
      return 'Pago de capital';
    case 'interest_distribution':
      return 'Distribución de interés';
    default:
      return type;
  }
}

function normalizeTransactionMetadata(metadata: Record<string, unknown> | null | undefined, type: string) {
  const base = { ...(metadata ?? {}) };

  if (typeof base.fraction_index === 'number' && typeof base.fractionIndex !== 'number') {
    base.fractionIndex = base.fraction_index;
  }

  delete base.fraction_index;

  return {
    ...base,
    type,
  };
}

export function buildTimeline({ invoiceEvents, fractionEvents, transactions }: BuildTimelineInput): TimelineItem[] {
  const statusItems: TimelineItem[] = [...invoiceEvents, ...fractionEvents].map((event) => {
      const normalized = buildEventLabel(event);

      return {
        id: String(event.id),
        at: event.created_at,
        kind: 'status' as const,
        label: normalized.label,
        metadata: normalized.metadata,
      } satisfies TimelineItem;
    });

  const financialItems: TimelineItem[] = transactions.map((transaction) => ({
    id: transaction.id,
    at: transaction.created_at,
    kind: 'financial',
    label: buildTransactionLabel(transaction.type),
    amount: toNumber(transaction.amount),
    metadata: normalizeTransactionMetadata(transaction.metadata, transaction.type),
  }));

  return [...statusItems, ...financialItems].sort((left, right) => {
      const timeCompare = left.at.localeCompare(right.at);

      if (timeCompare !== 0) {
        return timeCompare;
      }

      if (left.kind !== right.kind) {
        return left.kind === 'status' ? -1 : 1;
      }

      return left.id.localeCompare(right.id);
    });
}
