-- AUDITORIA DE SOLO LECTURA
-- Ejecutar en el SQL Editor del proyecto Supabase que utiliza la aplicación.
-- No crea, modifica ni elimina objetos ni datos.
-- Ejecutar cada SELECT por separado para poder revisar cada resultado.

-- 1) Tablas y columnas existentes en public
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 2) Tablas con Row Level Security (RLS) habilitado
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- 3) Políticas RLS existentes
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) Relaciones (foreign keys) entre tablas
select
  tc.table_name as tabla,
  kcu.column_name as columna,
  ccu.table_name as tabla_referenciada,
  ccu.column_name as columna_referenciada,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 5) Resumen de tablas clave del flujo de compras y egresos
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'empresas',
    'sucursales',
    'usuario_empresa',
    'proveedores',
    'productos',
    'facturas',
    'factura_items',
    'remitos',
    'remito_items',
    'pagos',
    'formas_pago',
    'ordenes_compra',
    'orden_compra_items',
    'solicitudes_compra',
    'gastos',
    'cuentas_bancarias',
    'cajas',
    'movimientos_tesoreria'
  )
order by table_name;
