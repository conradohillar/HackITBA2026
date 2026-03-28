import { z } from 'zod';

function normalizeCuit(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCuit(value: string) {
  const digits = normalizeCuit(value);

  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  return digits !== '00000000000';
}

const cuitSchema = z
  .string()
  .trim()
  .transform(normalizeCuit)
  .refine((value) => isValidCuit(value), 'Ingresá un CUIT válido.');

const dateSchema = z.iso.date('Ingresá una fecha válida.');

export const invoiceOriginationSchema = z
  .object({
    pagadorCuit: cuitSchema,
    pagadorName: z.string().trim().min(2, 'Ingresá el nombre del pagador.'),
    invoiceNumber: z.string().trim().min(1, 'Ingresá el número de factura.'),
    faceValue: z.coerce.number().positive('El monto debe ser mayor a 0.'),
    issueDate: dateSchema,
    dueDate: dateSchema,
    description: z.string().trim().min(5, 'Ingresá una descripción de la factura.'),
    fractionCount: z.coerce
      .number()
      .int('La cantidad de fracciones debe ser entera.')
      .positive('La cantidad de fracciones debe ser mayor a 0.'),
  })
  .refine((value) => value.dueDate >= value.issueDate, {
    path: ['dueDate'],
    message: 'La fecha de vencimiento debe ser igual o posterior a la de emisión.',
  });

export type InvoiceOriginationInput = z.infer<typeof invoiceOriginationSchema>;

function formatMoney(value: number) {
  return value.toFixed(2);
}

export function serializeInvoiceOriginationInput(input: InvoiceOriginationInput) {
  return {
    pagador_cuit: input.pagadorCuit,
    pagador_name: input.pagadorName,
    invoice_number: input.invoiceNumber,
    amount: formatMoney(input.faceValue),
    issue_date: input.issueDate,
    due_date: input.dueDate,
    description: input.description,
    total_fractions: input.fractionCount,
  };
}
