import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentAuthState } from '@/lib/auth/session';

export type InvoiceDetailRecord = {
  id: string;
  status: string;
  pagador_cuit: string;
  pagador_name: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  description: string;
  risk_tier: string | null;
  discount_rate: number | null;
  risk_explanation: string | null;
  bcra_data: {
    snapshot?: {
      evidence?: string[];
    };
  } | null;
  token_hash: string | null;
  net_amount: number | null;
  total_fractions: number | null;
};

export async function getInvoiceDetail(invoiceId: string) {
  const { user } = await getCurrentAuthState();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('invoices')
    .select(
      'id, status, pagador_cuit, pagador_name, invoice_number, amount, issue_date, due_date, description, risk_tier, discount_rate, risk_explanation, bcra_data, token_hash, net_amount, total_fractions',
    )
    .eq('id', invoiceId)
    .eq('cedente_id', user.id)
    .single<InvoiceDetailRecord>();

  return data ?? null;
}
