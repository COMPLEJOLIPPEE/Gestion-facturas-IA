-- AUDITORIA FOCALIZADA DE COMPRAS Y EGRESOS
-- Todas las consultas son de solo lectura. Ejecutar cada bloque por separado.
-- Objetivo: confirmar el detalle de las tablas existentes y sus reglas antes de diseñar una migración.

-- A) Columnas completas de las tablas que reutilizaremos o ampliaremos
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'empresas',
    'usuario_empresa',
    'proveedores',
    'productos',
    'facturas',
    'factura_items',
    'factura_conceptos',
    'conceptos_factura',
    'remitos',
    'remito_items',
    'pagos',
    'formas_pago'
  )
order by c.table_name, c.ordinal_position;

-- B) Confirmar si ya existen estructuras para locales, órdenes de compra, gastos y tesorería
select
  t.table_name
from information_schema.tables t
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and (
    t.table_name ilike '%sucursal%'
    or t.table_name ilike '%orden%compra%'
    or t.table_name ilike '%solicitud%compra%'
    or t.table_name ilike '%gasto%'
    or t.table_name ilike '%caja%'
    or t.table_name ilike '%banco%'
    or t.table_name ilike '%tesoreria%'
    or t.table_name ilike '%movimiento%'
  )
order by t.table_name;

-- C) Restricciones, claves únicas y checks de tablas críticas
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  pg_get_constraintdef(pc.oid) as definition
from information_schema.table_constraints tc
join pg_namespace n
  on n.nspname = tc.constraint_schema
join pg_class cl
  on cl.relname = tc.table_name
 and cl.relnamespace = n.oid
join pg_constraint pc
  on pc.conrelid = cl.oid
 and pc.conname = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name in (
    'empresas','usuario_empresa','proveedores','productos',
    'facturas','factura_items','remitos','remito_items','pagos'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- D) Triggers en las tablas de compras/egresos (para evitar duplicar lógica existente)
select
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'empresas','usuario_empresa','proveedores','productos',
    'facturas','factura_items','remitos','remito_items','pagos'
  )
order by event_object_table, trigger_name, event_manipulation;

-- E) Definición de las funciones de autorización ya usadas por RLS
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'usuario_puede_acceder_empresa',
    'usuario_puede_modificar_empresa',
    'usuario_puede_gestionar_catalogo'
  )
order by p.proname;
