alter table public.invoices
add column if not exists description text;

update public.invoices
set description = coalesce(nullif(trim(invoice_number), ''), 'Factura migrada sin descripción')
where description is null;

alter table public.invoices
alter column description set not null;

create index if not exists idx_invoices_pagador_cuit on public.invoices(pagador_cuit);
