-- Applied to production after verifying zero legacy-origin orders and documents.
-- Preserve commercial and audit records; remove only the obsolete origin option.
alter table public.aceite_orders
 drop constraint if exists aceite_orders_origin_check;
alter table public.aceite_orders
 add constraint aceite_orders_origin_check
 check (origin in ('SIC_SUPRASYS','MANUAL'));
