create index if not exists idx_transactions_fraction_id on public.transactions(fraction_id);

create index if not exists idx_fractions_invoice_status_index
on public.fractions(invoice_id, status, fraction_index);

create or replace function public.log_fraction_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is distinct from new.status and new.status = 'sold' then
    insert into public.events (
      entity_type,
      entity_id,
      event_type,
      old_data,
      new_data,
      actor_id,
      metadata
    )
    values (
      'fraction',
      new.id,
      'fraction.purchased',
      to_jsonb(old),
      to_jsonb(new),
      new.investor_id,
      jsonb_build_object(
        'invoice_id', new.invoice_id,
        'fraction_index', new.fraction_index,
        'purchased_at', new.purchased_at
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_fraction_purchase on public.fractions;

create trigger trg_log_fraction_purchase
after update on public.fractions
for each row
execute function public.log_fraction_purchase();

create or replace function public.fund_invoice(
  p_invoice_id uuid,
  p_fraction_count integer
)
returns table (
  purchased_count integer,
  checkout_total numeric(15,2),
  funded_fractions integer,
  funding_percentage integer,
  invoice_status public.invoice_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invoice public.invoices;
  v_fraction_ids uuid[] := '{}';
  v_checkout_total numeric(15,2) := 0;
  v_purchased_count integer := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication required to purchase invoice fractions';
  end if;

  if public.user_role() <> 'inversor' then
    raise exception 'Only inversor users can fund invoices';
  end if;

  if p_fraction_count is null or p_fraction_count <= 0 then
    raise exception 'Fraction count must be a positive integer';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  if v_invoice.status <> 'funding' then
    raise exception 'Invoice % is not open for funding', p_invoice_id;
  end if;

  if coalesce(v_invoice.total_fractions, 0) <= 0 then
    raise exception 'Invoice % has no purchasable fractions', p_invoice_id;
  end if;

  select
    coalesce(array_agg(locked.id order by locked.fraction_index), '{}'),
    coalesce(sum(locked.net_amount), 0)::numeric(15,2),
    count(*)
  into
    v_fraction_ids,
    v_checkout_total,
    v_purchased_count
  from (
    select id, net_amount, fraction_index
    from public.fractions
    where invoice_id = p_invoice_id
      and status = 'available'
    order by fraction_index
    limit p_fraction_count
    for update skip locked
  ) as locked;

  if v_purchased_count <> p_fraction_count then
    raise exception 'Only % fractions remain available for invoice %', v_purchased_count, p_invoice_id;
  end if;

  update public.fractions
  set
    status = 'sold',
    investor_id = v_actor_id,
    purchased_at = timezone('utc', now())
  where id = any(v_fraction_ids);

  insert into public.transactions (
    type,
    invoice_id,
    fraction_id,
    from_user_id,
    to_user_id,
    amount,
    description,
    metadata
  )
  select
    'fraction_purchase',
    f.invoice_id,
    f.id,
    v_actor_id,
    v_invoice.cedente_id,
    f.net_amount,
    format('Purchase of fraction %s for invoice %s', f.fraction_index, v_invoice.invoice_number),
    jsonb_build_object(
      'invoice_id', f.invoice_id,
      'fraction_index', f.fraction_index,
      'investor_id', v_actor_id
    )
  from public.fractions as f
  where f.id = any(v_fraction_ids);

  update public.invoices as invoices
  set
    funded_fractions = invoices.funded_fractions + v_purchased_count,
    updated_at = timezone('utc', now())
  where invoices.id = p_invoice_id
  returning * into v_invoice;

  if v_invoice.funded_fractions > v_invoice.total_fractions then
    raise exception 'Invoice % became over-funded', p_invoice_id;
  end if;

  if v_invoice.funded_fractions = v_invoice.total_fractions then
    perform public.transition_invoice(p_invoice_id, 'funded', v_actor_id);

    select *
    into v_invoice
    from public.invoices
    where id = p_invoice_id;
  end if;

  return query
  select
    v_purchased_count,
    v_checkout_total,
    v_invoice.funded_fractions,
    case
      when coalesce(v_invoice.total_fractions, 0) <= 0 then 0
      else round((v_invoice.funded_fractions::numeric / v_invoice.total_fractions::numeric) * 100)::integer
    end,
    v_invoice.status;
end;
$$;

revoke all on function public.fund_invoice(uuid, integer) from public;
grant execute on function public.fund_invoice(uuid, integer) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'invoices'
  ) then
    alter publication supabase_realtime add table public.invoices;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fractions'
  ) then
    alter publication supabase_realtime add table public.fractions;
  end if;
end;
$$;
