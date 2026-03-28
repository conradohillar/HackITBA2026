export type SettlementActionInput = {
  invoiceId: string;
};

export type SettlementInvoiceStatus = 'funded' | 'settling' | 'settled';

export type SettlementPayoutTotals = {
  principalTotal: number;
  interestTotal: number;
  cedenteDisbursementTotal: number;
};

export type SettlementRecord = SettlementPayoutTotals & {
  invoiceId: string;
  invoiceStatus: 'settled';
  settledFractions: number;
};

export type SettlementActionFieldErrors = Partial<Record<'invoiceId', string>>;

export type SettlementActionResult =
  | {
      status: 'success';
      message: string;
      settlement: SettlementRecord;
    }
  | {
      status: 'error';
      message: string;
      fieldErrors?: SettlementActionFieldErrors;
    };

export type SettlementFractionLedgerRow = {
  fractionId: string;
  fractionIndex: number;
  investorId: string;
  principalAmount: number;
  interestAmount: number;
  settledAt: string;
};

export type SettlementInvoiceRow = {
  id: string;
  cedenteId: string;
  status: SettlementInvoiceStatus;
  amount: number;
  netAmount: number;
  dueDate: string;
  fundedAt: string | null;
  settledAt: string | null;
};
