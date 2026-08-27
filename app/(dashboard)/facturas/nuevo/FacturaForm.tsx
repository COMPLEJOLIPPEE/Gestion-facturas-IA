'use client'

import { useMemo, useRef, useState } from "react"
import { crearFactura, crearProductoDesdeFactura } from "./actions"
import CargaIA from "./components/CargaIA"
import DatosComprobante from "./components/DatosComprobante"
import ProductosFactura, { LineaFactura } from "./components/ProductosFactura"
import ImpuestosFactura from "./components/ImpuestosFactura"
import PagoFactura from "./components/PagoFactura"
import { leerFacturaConIA, procesarLineasFacturaConIA, usarGPTParaFactura } from "@/lib/ai/actions"

type Proveedor = { id: string; nombre_fantasia: string }
type Empresa = { id: string; razon_social: string }
type Producto = { id: string; nombre: string; codigo: string | null }
type FormaPago = { id: string; nombre: string }
type Props = { proveedores: Proveedor[]; empresas: Empresa[]; empresaActivaId: string | null; productos: Producto[]; formasPago: FormaPago[] }
function numero(valor: unknown) { const resultado = Number(valor ?? 0); return Number.isFinite(resultado) ? resultado : 0 }
function redondear(valor: number) { return Number(valor.toFixed(2)) }

export function FacturaForm({ proveedores, empresas, empresaActivaId, productos, formasPago }: Props) {
  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>(productos)
  const [cargos, setCargos] = useState<{ descripcion: string; importe: number }[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [numeroFactura, setNumeroFactura] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [leyendoIA, setLeyendoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const [fallbackIA, setFallbackIA] = useState<{ base64: string; mimeType: string; logId: string | null; mensaje: string } | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [pagarAlCargar, setPagarAlCargar] = useState(false)
  const [montoPago, setMontoPago] = useState(0)
  const [pagoTocado, setPagoTocado] = useState(false)

  const agregarLinea = () => setLineas((prev) => [...prev, { producto_id: "", cantidad: 1, precio_unitario: 0, iva: 21, descuento: 0, precio_final: 0, bonificacion: 0, cantidad_bonificada: 0, tipo_bonificacion: "importe", precio_bruto_unitario: 0, precio_neto: 0, subtotal_neto: 0, impuestos_internos: 0, iva_importe: 0 }])
  const quitarLinea = (index: number) => setLineas((prev) => prev.filter((_, i) => i !== index))
  const actualizarLinea = (index: number, campo: keyof LineaFactura, valor: string | number) => setLineas((prev) => prev.map((linea, i) => {
    if (i !== index) return linea
    const siguiente = { ...linea, [campo]: valor }
    if (["cantidad", "precio_unitario", "precio_bruto_unitario", "descuento", "bonificacion", "cantidad_bonificada", "cantidad_bonificada_detalle", "tipo_bonificacion", "iva"].includes(campo)) {
      const cantidad = Math.max(0, numero(campo === "cantidad" ? valor : siguiente.cantidad))
      const precioUnitario = Math.abs(numero(campo === "precio_unitario" ? valor : siguiente.precio_unitario))
      const brutoGuardado = Math.abs(numero(siguiente.precio_bruto_unitario))
      const precioBrutoUnitario = campo === "precio_unitario" ? precioUnitario : (brutoGuardado > 0 ? brutoGuardado : precioUnitario)
      const descuento = Math.abs(numero(campo === "descuento" ? valor : siguiente.descuento))
      const bonificacion = Math.abs(numero(campo === "bonificacion" ? valor : siguiente.bonificacion))
      const cantidadBonificada = Math.min(Math.max(0, numero(campo === "cantidad_bonificada" ? valor : siguiente.cantidad_bonificada ?? siguiente.cantidad_bonificada_detalle)), cantidad)
      const tipoBonificacion = campo === "tipo_bonificacion" ? valor : siguiente.tipo_bonificacion
      const bonificacionImporte = tipoBonificacion === "cantidad" ? cantidadBonificada * precioBrutoUnitario : bonificacion
      const subtotalNeto = Math.max(0, cantidad * precioBrutoUnitario - descuento - bonificacionImporte)
      const precioNeto = cantidad > 0 ? subtotalNeto / cantidad : 0
      const tasaIVA = numero(campo === "iva" ? valor : siguiente.iva)
      const ivaImporte = subtotalNeto * (tasaIVA / 100)
      return { ...siguiente, cantidad, precio_unitario: precioUnitario, precio_bruto_unitario: redondear(precioBrutoUnitario), descuento, bonificacion, cantidad_bonificada: cantidadBonificada, precio_neto: redondear(precioNeto), subtotal_neto: redondear(subtotalNeto), iva_importe: redondear(ivaImporte), precio_final: redondear(precioNeto) }
    }
    return siguiente
  }))
  const actualizarProductoDeLinea = (index: number, productoId: string) => setLineas((prev) => prev.map((linea, i) => i === index ? { ...linea, producto_id: productoId } : linea))
  const crearProductoDesdeLinea = async (index: number, nombre: string, costo: number, iva: number) => {
    const formData = new FormData(); formData.set("nombre", nombre); formData.set("costo", String(costo)); formData.set("iva", String(iva))
    const resultado = await crearProductoDesdeFactura(formData)
    if (!resultado.ok) { alert(resultado.error); if (resultado.producto) { setProductosDisponibles((prev) => prev.some((producto) => producto.id === resultado.producto!.id) ? prev : [...prev, resultado.producto!]); actualizarProductoDeLinea(index, resultado.producto.id) }; return }
    if (resultado.producto) { setProductosDisponibles((prev) => [...prev, resultado.producto!]); actualizarProductoDeLinea(index, resultado.producto.id) }
  }
  const calculo = useMemo(() => {
    const lineasCalculadas = lineas.map((linea) => {
      const cantidad = numero(linea.cantidad)
      const precioUnitario = Math.abs(numero(linea.precio_unitario))
      const brutoGuardado = Math.abs(numero(linea.precio_bruto_unitario))
      const precioBrutoUnitario = brutoGuardado > 0 ? brutoGuardado : precioUnitario
      const bruto = cantidad * precioBrutoUnitario
      const descuento = Math.abs(numero(linea.descuento))
      const bonificacion = Math.abs(numero(linea.bonificacion))
      const cantidadBonificada = Math.min(Math.max(0, numero(linea.cantidad_bonificada ?? linea.cantidad_bonificada_detalle)), cantidad)
      const bonificacionPorCantidad = linea.tipo_bonificacion === "cantidad"
      const bonificacionImporte = bonificacionPorCantidad ? cantidadBonificada * precioBrutoUnitario : bonificacion
      const subtotalNetoCalculado = Math.max(0, bruto - descuento - bonificacionImporte)
      const subtotalNetoExtraido = linea.subtotal_neto != null && numero(linea.subtotal_neto) !== 0 ? Math.abs(numero(linea.subtotal_neto)) : null
      const subtotalNeto = subtotalNetoExtraido ?? subtotalNetoCalculado
      const precioNeto = cantidad > 0 ? subtotalNeto / cantidad : 0
      const tasaIVA = numero(linea.iva)
      const ivaImporteExtraido = linea.iva_importe != null && numero(linea.iva_importe) !== 0 ? Math.abs(numero(linea.iva_importe)) : null
      const ivaImporte = ivaImporteExtraido ?? subtotalNeto * (tasaIVA / 100)
      const impuestosInternos = Math.abs(numero(linea.impuestos_internos))
      return { ...linea, cantidad, precio_unitario: precioUnitario, precio_bruto_unitario: redondear(precioBrutoUnitario), descuento, bonificacion, cantidad_bonificada: cantidadBonificada, precio_neto: redondear(precioNeto), precio_final: redondear(precioNeto), subtotal_neto: redondear(subtotalNeto), iva_importe: redondear(ivaImporte), impuestos_internos: redondear(impuestosInternos), _bruto: bruto, _descuentoTotal: descuento + bonificacionImporte }
    })
    const resumen = lineasCalculadas.reduce((a, l) => ({ subtotalBruto: a.subtotalBruto + l._bruto, descuentos: a.descuentos + l._descuentoTotal, subtotalNeto: a.subtotalNeto + l.subtotal_neto, iva: a.iva + l.iva_importe, impuestosInternos: a.impuestosInternos + l.impuestos_internos }), { subtotalBruto: 0, descuentos: 0, subtotalNeto: 0, iva: 0, impuestosInternos: 0 })
    const totalCargos = cargos.reduce((a, c) => a + Math.abs(numero(c.importe)), 0)
    const ivaRedondeado = redondear(resumen.iva); const impuestosInternosRedondeados = redondear(resumen.impuestosInternos)
    return { lineas: lineasCalculadas, subtotalBruto: redondear(resumen.subtotalBruto), descuentos: redondear(resumen.descuentos), subtotalNeto: redondear(resumen.subtotalNeto), iva: ivaRedondeado, impuestosInternos: impuestosInternosRedondeados, totalCargos: redondear(totalCargos), total: redondear(resumen.subtotalNeto + ivaRedondeado + impuestosInternosRedondeados + totalCargos) }
  }, [lineas, cargos])
  const montoPagoMostrado = pagoTocado ? redondear(montoPago) : calculo.total
  const archivoABase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file) })
  async function aplicarDatosFacturaIA(datos: Awaited<ReturnType<typeof leerFacturaConIA>>) {
    setCargos((datos.cargos ?? []).map((cargo) => ({ descripcion: cargo.descripcion, importe: Math.abs(numero(cargo.importe)) }))); if (datos.numero) setNumeroFactura(datos.numero); if (datos.fecha) setFecha(datos.fecha); if (datos.fecha_vencimiento) setFechaVencimiento(datos.fecha_vencimiento)
    let proveedorDetectadoId = proveedorId
    if (datos.proveedor_nombre) { const nombreIA = datos.proveedor_nombre.toLowerCase().trim(); const proveedorEncontrado = proveedores.find((p) => { const n = p.nombre_fantasia.toLowerCase().trim(); return n.includes(nombreIA) || nombreIA.includes(n) }); if (proveedorEncontrado) { proveedorDetectadoId = proveedorEncontrado.id; setProveedorId(proveedorEncontrado.id) } }
    if (datos.lineas.length > 0) { const lineasProcesadas = await procesarLineasFacturaConIA(proveedorDetectadoId || null, datos.lineas, productos.map((p) => ({ id: p.id, nombre: p.nombre }))); setLineas(lineasProcesadas) }
  }
  async function manejarArchivoIA(file: File) { setLeyendoIA(true); setErrorIA(null); setFallbackIA(null); try { const base64 = await archivoABase64(file); await aplicarDatosFacturaIA(await leerFacturaConIA(base64, file.type)) } catch (error) { const mensaje = error instanceof Error ? error.message : "No se pudo leer la factura."; if (mensaje.startsWith("GEMINI_FALLBACK_REQUIRED|")) { const partes = mensaje.split("|"); const logId = partes[1] || null; const motivo = partes.slice(2).join("|") || "Gemini no pudo procesar el documento."; try { const base64 = await archivoABase64(file); setFallbackIA({ base64, mimeType: file.type, logId, mensaje: motivo }); setErrorIA(null) } catch { setErrorIA("No se pudo preparar el documento para el procesamiento alternativo.") } } else setErrorIA(mensaje) } finally { setLeyendoIA(false); if (inputArchivoRef.current) inputArchivoRef.current.value = "" } }
  async function autorizarGPT() { if (!fallbackIA) return; setLeyendoIA(true); setErrorIA(null); try { const datos = await usarGPTParaFactura(fallbackIA.base64, fallbackIA.mimeType, fallbackIA.logId); await aplicarDatosFacturaIA(datos); setFallbackIA(null) } catch (error) { setErrorIA(error instanceof Error ? error.message : "No se pudo procesar el documento con GPT-4o-mini.") } finally { setLeyendoIA(false) } }
  return (<form action={crearFactura} className="space-y-6"><input type="hidden" name="empresa_id" value={empresaActivaId ?? ""} /><input type="hidden" name="items" value={JSON.stringify(calculo.lineas)} /><input type="hidden" name="subtotal" value={calculo.subtotalNeto} /><input type="hidden" name="iva" value={calculo.iva} /><input type="hidden" name="total" value={calculo.total} /><CargaIA inputArchivoRef={inputArchivoRef} leyendoIA={leyendoIA} errorIA={errorIA} manejarArchivoIA={manejarArchivoIA} />{fallbackIA && (<div className="rounded-xl border border-amber-300 bg-amber-50 p-5"><div className="mb-3"><h3 className="text-base font-semibold text-amber-900">⚠️ Gemini no pudo procesar el documento</h3><p className="mt-1 text-sm text-amber-800">{fallbackIA.mensaje}</p></div><p className="mb-4 text-sm text-gray-700">Podés intentar procesarlo con <strong>GPT-4o-mini</strong> como alternativa.</p><div className="flex gap-3"><button type="button" onClick={autorizarGPT} disabled={leyendoIA} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{leyendoIA ? "Procesando con GPT..." : "Usar GPT-4o-mini"}</button><button type="button" onClick={() => { setFallbackIA(null); setErrorIA(null) }} disabled={leyendoIA} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button></div></div>)}<DatosComprobante proveedores={proveedores} empresas={empresas} empresaActivaId={empresaActivaId} proveedorId={proveedorId} setProveedorId={setProveedorId} numero={numeroFactura} setNumero={setNumeroFactura} fecha={fecha} setFecha={setFecha} fechaVencimiento={fechaVencimiento} setFechaVencimiento={setFechaVencimiento} /><ProductosFactura productos={productosDisponibles} lineas={calculo.lineas} agregarLinea={agregarLinea} quitarLinea={quitarLinea} actualizarLinea={actualizarLinea} actualizarProductoDeLinea={actualizarProductoDeLinea} crearProductoDesdeLinea={crearProductoDesdeLinea} /><ImpuestosFactura subtotal={calculo.subtotalNeto} descuentos={calculo.descuentos} iva={calculo.iva} impuestosInternos={calculo.impuestosInternos} cargos={cargos} total={calculo.total} /><PagoFactura pagarAlCargar={pagarAlCargar} setPagarAlCargar={setPagarAlCargar} montoPagoMostrado={montoPagoMostrado} setMontoPago={setMontoPago} setPagoTocado={setPagoTocado} total={calculo.total} formasPago={formasPago} /><button type="submit" disabled={lineas.length === 0 || !empresaActivaId} className="rounded-lg bg-black px-5 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Guardar factura</button></form>)
}
