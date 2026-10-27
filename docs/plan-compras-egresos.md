# Plan de implementación: Compras, egresos y control financiero

## Objetivo

Ampliar el sistema existente para controlar el circuito completo de compras y egresos de las cinco unidades de negocio, con separación legal por CUIT, trazabilidad de aprobaciones y una vista consolidada para gerencia.

## Estructura empresarial confirmada

- **Empresa / CUIT 1:** Lippee y Hoss.
- **Empresa / CUIT 2:** Piccola Venni, Resto WPCC y Fábrica Piccola.

Los nombres son etiquetas de trabajo; los CUIT reales no deben guardarse en código ni en archivos de configuración. Se cargarán en la configuración de cada empresa cuando se confirme el esquema y el flujo de permisos.

## Flujo operativo propuesto

1. **Solicitud de compra:** un local solicita productos, cantidades y fecha necesaria.
2. **Revisión y aprobación:** administración revisa presupuesto, proveedor y condiciones. Las compras extraordinarias pueden requerir aprobación adicional.
3. **Orden de compra:** se registra proveedor, empresa compradora, unidad de negocio destino, precios acordados y condición de pago.
4. **Recepción:** se compara lo recibido con la orden; se registran diferencias, faltantes o sustituciones.
5. **Factura:** se adjunta PDF o imagen, se extraen datos con IA y una persona valida los campos críticos.
6. **Control de duplicados:** verificar CUIT del proveedor, tipo y número de comprobante, punto de venta si está disponible, empresa receptora e importe.
7. **Pago:** registrar efectivo o transferencia, fecha, cuenta/caja utilizada, importe y comprobante. Admitir pagos parciales.
8. **Seguimiento:** actualizar deuda, vencimientos, historial de precios e indicadores financieros.

## Principios del modelo de datos

- Mantener una separación estricta entre los dos CUIT y sus obligaciones.
- Permitir que un proveedor trabaje con una o ambas empresas, sin duplicarlo innecesariamente.
- Cada factura pertenece a una sola empresa legal.
- La asignación del costo a una sucursal/unidad de negocio puede ser distinta de la empresa receptora de la factura.
- Para gastos compartidos, registrar distribuciones por unidad de negocio sin duplicar la factura ni el pago.
- Los remitos, facturas, órdenes y pagos deben conservar sus relaciones y comprobantes.
- Los pagos en efectivo deben vincularse a una caja; las transferencias, a una cuenta bancaria. No confundir deuda registrada con salida de dinero.
- Los cambios de estado y aprobaciones deben dejar registro de quién hizo la acción y cuándo.
- Toda tabla expuesta a la API debe tener RLS y políticas coherentes con los permisos actuales.

## Módulos y prioridades

### Fase 0 — Auditoría de seguridad y esquema
- Verificar el esquema real del proyecto Supabase usado por producción.
- Identificar las tablas existentes de empresas, usuarios, accesos, facturas, remitos y pagos.
- Revisar RLS, políticas y relaciones antes de crear migraciones.
- No aplicar cambios en producción hasta validar la migración en una base local o de desarrollo.

### Fase 1 — Compras
- Solicitudes y órdenes de compra.
- Detalle de productos, cantidades, precios, descuentos y destino.
- Recepción parcial/completa y diferencias contra la orden.
- Estados y aprobaciones.

### Fase 2 — Egresos y cuentas por pagar
- Servicios recurrentes, impuestos y otros gastos sin factura de mercadería.
- Vencimientos y alertas.
- Pagos parciales y totales, efectivo y transferencia.
- Adjuntar comprobantes y evitar pagos duplicados.

### Fase 3 — Control de costos
- Historial de precios por producto, proveedor y unidad de medida.
- Comparación de proveedores y condiciones comerciales.
- Alertas de aumentos, variaciones atípicas y compras fuera de presupuesto.
- Comparación de compras solicitadas, recibidas, facturadas y pagadas.

### Fase 4 — Tesorería y análisis
- Caja y bancos.
- Conciliación de movimientos.
- Flujo de fondos a 30, 60 y 90 días.
- Dashboard por empresa, local, categoría y grupo.

## Criterios de aceptación

- No se mezclan facturas ni obligaciones de empresas distintas.
- Una factura compartida entre locales se registra una sola vez y su costo puede distribuirse.
- No se marca una factura como pagada si el total de pagos confirmados no cubre el saldo.
- Los pagos en efectivo y transferencia dejan trazabilidad.
- Las órdenes de compra pueden compararse con la recepción y la factura.
- Los reportes distinguen egresos pagados, obligaciones pendientes y costos imputados al período.
- Los permisos existentes y RLS siguen funcionando; las migraciones se prueban antes de llegar a producción.

## Estado inicial

Se creó una rama de trabajo separada. El conector de Supabase no logró consultar el esquema (timeout), por lo que la primera tarea pendiente es obtener una auditoría de solo lectura antes de escribir o aplicar migraciones. No se hicieron cambios en la base de datos de producción.
