import { createClient } from "@/lib/supabase/server"
import { DataTable, Column } from "@/components/DataTable"
import { ComprasChart, ComprasPorMes } from "@/components/ComprasChart"
import { addLocalDays, formatDateAR, toLocalDateKey } from "@/lib/utils"

type Movimiento = { id: string; tipo: "Factura" | "Remito"; numero: string | null; fecha: string; proveedor: string; monto: number; href: string }
type Vencimiento = { id: string; tipo: "Factura" | "Remito"; numero: string | null; fecha_vencimiento: string; proveedor: string; monto: number; href: string }
type AumentoPrecio = { id: string; producto: string; precioAnterior: number; precioActual: number; variacion: number }
type SaldoProveedor = { id: string; proveedor: string; comprobantes: number; saldo: number }

function formatMoney(value: number) { return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` }
function monthRange(offset: number) { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() + offset, 1); const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1); return { start: toLocalDateKey(start), end: toLocalDateKey(end) } }
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const thisMonth = monthRange(0), prevMonth = monthRange(-1), sixMonthsAgo = monthRange(-5)
  const now = new Date(), today = toLocalDateKey(now), in15Days = toLocalDateKey(addLocalDays(now, 15))

  const [facturasMes, remitosMes, facturasMesAnterior, remitosMesAnterior, facturasPendientes, remitosPendientes, proveedoresActivos, ultimasFacturas, ultimosRemitos, facturasHistorico, remitosHistorico, vencimientosFacturas, vencimientosRemitos, facturaItems, remitoItems] = await Promise.all([
    supabase.from("facturas").select("total").gte("fecha", thisMonth.start).lt("fecha", thisMonth.end),
    supabase.from("remitos").select("monto_total").gte("fecha", thisMonth.start).lt("fecha", thisMonth.end),
    supabase.from("facturas").select("total").gte("fecha", prevMonth.start).lt("fecha", prevMonth.end),
    supabase.from("remitos").select("monto_total").gte("fecha", prevMonth.start).lt("fecha", prevMonth.end),
    supabase.from("facturas").select("id, total, proveedor_id, proveedores (nombre_fantasia)").neq("estado", "pagado"),
    supabase.from("remitos").select("id, monto_total, proveedor_id, proveedores (nombre_fantasia)").neq("estado", "pagado"),
    supabase.from("proveedores").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("facturas").select("id, numero, fecha, total, proveedores (nombre_fantasia)").order("fecha", { ascending: false }).limit(5),
    supabase.from("remitos").select("id, numero, fecha, monto_total, proveedores (nombre_fantasia)").order("fecha", { ascending: false }).limit(5),
    supabase.from("facturas").select("total, fecha").gte("fecha", sixMonthsAgo.start),
    supabase.from("remitos").select("monto_total, fecha").gte("fecha", sixMonthsAgo.start),
    supabase.from("facturas").select("id, numero, fecha, fecha_vencimiento, total, proveedores (nombre_fantasia)").not("fecha_vencimiento", "is", null).lte("fecha_vencimiento", in15Days).order("fecha_vencimiento", { ascending: true }).limit(50),
    supabase.from("remitos").select("id, numero, fecha, fecha_vencimiento, monto_total, proveedores (nombre_fantasia)").not("fecha_vencimiento", "is", null).lte("fecha_vencimiento", in15Days).order("fecha_vencimiento", { ascending: true }).limit(50),
    supabase.from("factura_items").select("producto_id, precio_unitario, productos (nombre), facturas (fecha)").not("precio_unitario", "is", null).not("producto_id", "is", null),
    supabase.from("remito_items").select("producto_id, precio_unitario, productos (nombre), remitos (fecha)").not("precio_unitario", "is", null).not("producto_id", "is", null),
  ])

  const sum = (rows: { total?: number | null; monto_total?: number | null }[] | null, key: "total" | "monto_total") => (rows ?? []).reduce((acc, r) => acc + Number(r[key] ?? 0), 0)
  const comprasMes = sum(facturasMes.data, "total") + sum(remitosMes.data, "monto_total")
  const comprasMesAnterior = sum(facturasMesAnterior.data, "total") + sum(remitosMesAnterior.data, "monto_total")
  const variacion = comprasMesAnterior > 0 ? ((comprasMes - comprasMesAnterior) / comprasMesAnterior) * 100 : null
  const facturasCount = facturasMes.data?.length ?? 0, remitosCount = remitosMes.data?.length ?? 0

  const facturaIdsPendientes = (facturasPendientes.data ?? []).map(f => f.id), remitoIdsPendientes = (remitosPendientes.data ?? []).map(r => r.id)
  const [pagosDeFacturas, pagosDeRemitos] = await Promise.all([
    facturaIdsPendientes.length ? supabase.from("pagos").select("factura_id, monto").in("factura_id", facturaIdsPendientes) : Promise.resolve({ data: [] as { factura_id: string | null; monto: number }[] }),
    remitoIdsPendientes.length ? supabase.from("pagos").select("remito_id, monto").in("remito_id", remitoIdsPendientes) : Promise.resolve({ data: [] as { remito_id: string | null; monto: number }[] }),
  ])
  const pagadoPorFactura = new Map<string, number>(), pagadoPorRemito = new Map<string, number>()
  for (const p of pagosDeFacturas.data ?? []) if (p.factura_id) pagadoPorFactura.set(p.factura_id, (pagadoPorFactura.get(p.factura_id) ?? 0) + Number(p.monto ?? 0))
  for (const p of pagosDeRemitos.data ?? []) if (p.remito_id) pagadoPorRemito.set(p.remito_id, (pagadoPorRemito.get(p.remito_id) ?? 0) + Number(p.monto ?? 0))

  const saldoPorProveedor = new Map<string, { nombre: string; comprobantes: number; saldo: number }>()
  for (const f of facturasPendientes.data ?? []) { if (!f.proveedor_id) continue; const proveedor = Array.isArray(f.proveedores) ? f.proveedores[0] : f.proveedores; const saldo = Math.max(Number(f.total ?? 0) - (pagadoPorFactura.get(f.id) ?? 0), 0); if (saldo <= 0) continue; const e = saldoPorProveedor.get(f.proveedor_id) ?? { nombre: proveedor?.nombre_fantasia ?? "—", comprobantes: 0, saldo: 0 }; e.comprobantes++; e.saldo += saldo; saldoPorProveedor.set(f.proveedor_id, e) }
  for (const r of remitosPendientes.data ?? []) { if (!r.proveedor_id) continue; const proveedor = Array.isArray(r.proveedores) ? r.proveedores[0] : r.proveedores; const saldo = Math.max(Number(r.monto_total ?? 0) - (pagadoPorRemito.get(r.id) ?? 0), 0); if (saldo <= 0) continue; const e = saldoPorProveedor.get(r.proveedor_id) ?? { nombre: proveedor?.nombre_fantasia ?? "—", comprobantes: 0, saldo: 0 }; e.comprobantes++; e.saldo += saldo; saldoPorProveedor.set(r.proveedor_id, e) }
  const saldosProveedores: SaldoProveedor[] = Array.from(saldoPorProveedor.entries()).map(([id, v]) => ({ id, proveedor: v.nombre, comprobantes: v.comprobantes, saldo: v.saldo })).sort((a,b) => b.saldo-a.saldo)
  const pendientesCount = saldosProveedores.reduce((a,p)=>a+p.comprobantes,0), pendientesMonto = saldosProveedores.reduce((a,p)=>a+p.saldo,0)
  const saldosProveedoresColumns: Column<SaldoProveedor>[] = [
    { key: "proveedor", label: "Proveedor" }, { key: "comprobantes", label: "Comprobantes", align: "center" }, { key: "saldo", label: "Saldo pendiente", align: "right", render: p => <span className="font-medium">{formatMoney(p.saldo)}</span> },
  ]

  const movimientos: Movimiento[] = [
    ...(ultimasFacturas.data ?? []).map(f => ({ id:f.id, tipo:"Factura" as const, numero:f.numero, fecha:f.fecha, proveedor:(Array.isArray(f.proveedores)?f.proveedores[0]:f.proveedores)?.nombre_fantasia ?? "—", monto:Number(f.total??0), href:`/facturas/${f.id}` })),
    ...(ultimosRemitos.data ?? []).map(r => ({ id:r.id, tipo:"Remito" as const, numero:r.numero, fecha:r.fecha, proveedor:(Array.isArray(r.proveedores)?r.proveedores[0]:r.proveedores)?.nombre_fantasia ?? "—", monto:Number(r.monto_total??0), href:`/remitos/${r.id}` })),
  ].sort((a,b)=>a.fecha<b.fecha?1:-1).slice(0,6)
  const columns: Column<Movimiento>[] = [
    { key:"tipo", label:"Tipo", render:m=>m.tipo==="Factura"?"📄 Factura":"📝 Remito" }, { key:"numero", label:"Número", render:m=>m.numero??"—" }, { key:"proveedor", label:"Proveedor" }, { key:"fecha", label:"Fecha", render:m=>formatDateAR(m.fecha) }, { key:"monto", label:"Monto", align:"right", render:m=>formatMoney(m.monto) },
  ]

  const comprasPorMes: ComprasPorMes[] = Array.from({length:6}).map((_,i)=>{ const offset=-5+i, range=monthRange(offset), n=new Date(), label=MESES_CORTOS[(n.getMonth()+offset+120)%12]; const totalFacturas=(facturasHistorico.data??[]).filter(f=>f.fecha>=range.start&&f.fecha<range.end).reduce((a,f)=>a+Number(f.total??0),0); const totalRemitos=(remitosHistorico.data??[]).filter(r=>r.fecha>=range.start&&r.fecha<range.end).reduce((a,r)=>a+Number(r.monto_total??0),0); return {mes:label,total:totalFacturas+totalRemitos} })

  // Vencimientos: calcular saldo real con todos los pagos y excluir saldo cero.
  const dueFacturaIds = (vencimientosFacturas.data ?? []).map(f => f.id), dueRemitoIds = (vencimientosRemitos.data ?? []).map(r => r.id)
  const [pagosVencFacturas, pagosVencRemitos] = await Promise.all([
    dueFacturaIds.length ? supabase.from("pagos").select("factura_id, monto").in("factura_id", dueFacturaIds) : Promise.resolve({data:[] as {factura_id:string|null;monto:number}[]}),
    dueRemitoIds.length ? supabase.from("pagos").select("remito_id, monto").in("remito_id", dueRemitoIds) : Promise.resolve({data:[] as {remito_id:string|null;monto:number}[]}),
  ])
  const pagosVF = new Map<string,number>(), pagosVR = new Map<string,number>()
  for (const p of pagosVencFacturas.data ?? []) if(p.factura_id) pagosVF.set(p.factura_id,(pagosVF.get(p.factura_id)??0)+Number(p.monto??0))
  for (const p of pagosVencRemitos.data ?? []) if(p.remito_id) pagosVR.set(p.remito_id,(pagosVR.get(p.remito_id)??0)+Number(p.monto??0))
  const seen = new Set<string>()
  const vencimientos: Vencimiento[] = [
    ...(vencimientosFacturas.data ?? []).map(f=>{const saldo=Math.max(Number(f.total??0)-(pagosVF.get(f.id)??0),0); return saldo>0?{id:f.id,tipo:"Factura" as const,numero:f.numero,fecha_vencimiento:f.fecha_vencimiento as string,proveedor:(Array.isArray(f.proveedores)?f.proveedores[0]:f.proveedores)?.nombre_fantasia??"—",monto:saldo,href:`/facturas/${f.id}`}:null}),
    ...(vencimientosRemitos.data ?? []).map(r=>{const saldo=Math.max(Number(r.monto_total??0)-(pagosVR.get(r.id)??0),0); return saldo>0?{id:r.id,tipo:"Remito" as const,numero:r.numero,fecha_vencimiento:r.fecha_vencimiento as string,proveedor:(Array.isArray(r.proveedores)?r.proveedores[0]:r.proveedores)?.nombre_fantasia??"—",monto:saldo,href:`/remitos/${r.id}`}:null}),
  ].filter((v): v is Vencimiento => { if(!v) return false; const key=`${v.tipo}|${v.numero??""}|${v.proveedor}|${v.fecha_vencimiento}|${v.monto}`; if(seen.has(key)) return false; seen.add(key); return true }).sort((a,b)=>a.fecha_vencimiento<b.fecha_vencimiento?-1:1).slice(0,6)
  const vencimientosColumns: Column<Vencimiento>[] = [
    {key:"tipo",label:"Tipo",render:v=>v.tipo==="Factura"?"📄 Factura":"📝 Remito"},{key:"numero",label:"Número",render:v=>v.numero??"—"},{key:"proveedor",label:"Proveedor"},{key:"fecha_vencimiento",label:"Vence",render:v=><span className={v.fecha_vencimiento<today?"font-medium text-red-600":""}>{formatDateAR(v.fecha_vencimiento)}{v.fecha_vencimiento<today?" (vencida)":""}</span>},{key:"monto",label:"Saldo pendiente",align:"right",render:v=>formatMoney(v.monto)},
  ]

  type Punto={fecha:string;precio:number}; const historialPorProducto=new Map<string,{nombre:string;puntos:Punto[]}>(); const registrarPunto=(productoId:string|null,nombre:string|undefined,fecha:string|undefined,precio:number|null)=>{if(!productoId||!fecha||precio===null)return; const e=historialPorProducto.get(productoId)??{nombre:nombre??"—",puntos:[]}; e.puntos.push({fecha,precio}); if(nombre)e.nombre=nombre; historialPorProducto.set(productoId,e)}
  for(const item of facturaItems.data??[]){const producto=Array.isArray(item.productos)?item.productos[0]:item.productos;const factura=Array.isArray(item.facturas)?item.facturas[0]:item.facturas;registrarPunto(item.producto_id,producto?.nombre,factura?.fecha,item.precio_unitario)}
  for(const item of remitoItems.data??[]){const producto=Array.isArray(item.productos)?item.productos[0]:item.productos;const remito=Array.isArray(item.remitos)?item.remitos[0]:item.remitos;registrarPunto(item.producto_id,producto?.nombre,remito?.fecha,item.precio_unitario)}
  const aumentos:AumentoPrecio[]=Array.from(historialPorProducto.entries()).map(([productoId,{nombre,puntos}])=>{const o=puntos.sort((a,b)=>a.fecha<b.fecha?-1:1);if(o.length<2)return null;const actual=o[o.length-1],anterior=o[o.length-2];if(anterior.precio<=0)return null;const v=((actual.precio-anterior.precio)/anterior.precio)*100;return{id:productoId,producto:nombre,precioAnterior:anterior.precio,precioActual:actual.precio,variacion:v}}).filter((a):a is AumentoPrecio=>a!==null&&a.variacion>0).sort((a,b)=>b.variacion-a.variacion).slice(0,5)
  const aumentosColumns:Column<AumentoPrecio>[]=[{key:"producto",label:"Producto"},{key:"precioAnterior",label:"Precio anterior",align:"right",render:a=>formatMoney(a.precioAnterior)},{key:"precioActual",label:"Precio actual",align:"right",render:a=>formatMoney(a.precioActual)},{key:"variacion",label:"Aumento",align:"right",render:a=><span className="font-medium text-red-600">▲ {a.variacion.toFixed(1)}%</span>}]

  return <div><div className="mb-8"><h1 className="text-3xl font-bold">Hola 👋</h1><p className="text-gray-600">{user?.email}</p></div>
    <div className="grid gap-6 md:grid-cols-4"><div className="rounded-xl bg-white p-6 shadow"><p className="text-gray-500">Compras del mes</p><h2 className="mt-2 text-3xl font-bold">{formatMoney(comprasMes)}</h2>{variacion!==null&&<p className={`mt-1 text-sm ${variacion>=0?"text-red-600":"text-green-600"}`}>{variacion>=0?"▲":"▼"} {Math.abs(variacion).toFixed(1)}% vs mes anterior</p>}</div><div className="rounded-xl bg-white p-6 shadow"><p className="text-gray-500">Facturas y remitos (mes)</p><h2 className="mt-2 text-3xl font-bold">{facturasCount+remitosCount}</h2><p className="mt-1 text-sm text-gray-400">{facturasCount} facturas · {remitosCount} remitos</p></div><div className="rounded-xl bg-white p-6 shadow"><p className="text-gray-500">Pendientes de pago</p><h2 className="mt-2 text-3xl font-bold">{pendientesCount}</h2><p className="mt-1 text-sm text-gray-400">{formatMoney(pendientesMonto)} de saldo</p></div><div className="rounded-xl bg-white p-6 shadow"><p className="text-gray-500">Proveedores activos</p><h2 className="mt-2 text-3xl font-bold">{proveedoresActivos.count??0}</h2></div></div>
    <div className="mt-8 rounded-xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-bold">Evolución de compras (últimos 6 meses)</h2><ComprasChart data={comprasPorMes}/></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-bold">Saldo pendiente por proveedor</h2>{saldosProveedores.length===0?<p className="text-gray-500">No hay saldos pendientes con proveedores.</p>:<DataTable columns={saldosProveedoresColumns} data={saldosProveedores}/>}</div><div className="rounded-xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-bold">Vencimientos próximos</h2>{vencimientos.length===0?<p className="text-gray-500">No hay vencimientos en los próximos 15 días.</p>:<DataTable columns={vencimientosColumns} data={vencimientos}/>}</div></div>
    <div className="mt-8 rounded-xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-bold">Mayores aumentos de precio</h2>{aumentos.length===0?<p className="text-gray-500">Todavía no hay suficiente historial de compras por producto.</p>:<DataTable columns={aumentosColumns} data={aumentos}/>}</div>
    <div className="mt-8 rounded-xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-bold">Últimos movimientos</h2>{movimientos.length===0?<p className="text-gray-500">Todavía no hay facturas ni remitos cargados.</p>:<DataTable columns={columns} data={movimientos}/>}</div>
  </div>
}