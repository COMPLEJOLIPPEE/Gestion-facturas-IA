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
type Cargo = { descripcion: string; importe: number }
type TotalesIA = { subtotalBruto: number | null; descuentoTotal: number | null; subtotalNeto: number | null; ivaTotal: number | null; impuestosInternosTotal: number | null; total: number | null }

function numero(valor: unknown) { const n = Number(valor ?? 0); return Number.isFinite(n) ? n : 0 }
function redondear(valor: number) { return Number(valor.toFixed(2)) }

export function FacturaForm({ proveedores, empresas, empresaActivaId, productos, formasPago }: Props) {
  const [lineas, setLineas] = useState<LineaFactura[]>([])
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>(productos)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [numeroFactura, setNumeroFactura] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [leyendoIA, setLeyendoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const [fallbackIA, setFallbackIA] = useState<{ base64: string; mimeType: string; logId: string | null; mensaje: string } | null>(null)
  const [totalesIA, setTotalesIA] = useState<TotalesIA | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [pagarAlCargar, setPagarAlCargar] = useState(false)
  const [montoPago, setMontoPago] = useState(0)
  const [pagoTocado, setPagoTocado] = useState(false)

  const agregarLinea = () => setLineas((prev) => [...prev, { producto_id: "", cantidad: 1, precio_unitario: 0, iva: 21, descuento: 0, precio_final: 0, bonificacion: 0, cantidad_bonificada: 0, tipo_bonificacion: "importe", tipo_linea: "producto", es_ajuste_negativo: false }])
  const quitarLinea = (index: number) => setLineas((prev) => prev.filter((_, i) => i !== index))
  const actualizarLinea = (index: number, campo: keyof LineaFactura, valor: string | number | boolean) => setLineas((prev) => prev.map((linea, i) => i === index ? { ...linea, [campo]: valor } : linea))
  const actualizarProductoDeLinea = (index: number, productoId: string) => setLineas((prev) => prev.map((linea, i) => i === index ? { ...linea, producto_id: productoId } : linea))

  const crearProductoDesdeLinea = async (index: number, nombre: string) => {
    const formData = new FormData(); formData.set("nombre", nombre); formData.set("costo", "0")
    const resultado = await crearProductoDesdeFactura(formData)
    if (!resultado.ok) { alert(resultado.error); if (resultado.producto) { setProductosDisponibles((prev) => prev.some((producto) => producto.id === resultado.producto!.id) ? prev : [...prev, resultado.producto!]); actualizarProductoDeLinea(index, resultado.producto.id) }; return }
    if (resultado.producto) { setProductosDisponibles((prev) => [...prev, resultado.producto!]); actualizarProductoDeLinea(index, resultado.producto.id) }
  }

  const resumenManual = useMemo(() => {
    const subtotal = lineas.reduce((s, l) => s + numero(l.subtotal_neto), 0)
    const iva = lineas.reduce((s, l) => s + numero(l.iva_importe), 0)
    const internos = lineas.reduce((s, l) => s + numero(l.impuestos_internos), 0)
    const cargosTotal = cargos.reduce((s, c) => s + numero(c.importe), 0)
    return { subtotalNeto: redondear(subtotal), iva: redondear(iva), impuestosInternos: redondear(internos), total: redondear(subtotal + iva + internos + cargosTotal) }
  }, [lineas, cargos])

  const subtotalMostrado = totalesIA?.subtotalNeto ?? resumenManual.subtotalNeto
  const ivaMostrado = totalesIA?.ivaTotal ?? resumenManual.iva
  const impuestosInternosMostrados = totalesIA?.impuestosInternosTotal ?? resumenManual.impuestosInternos
  const descuentosMostrados = totalesIA?.descuentoTotal ?? 0
  const totalOficial = totalesIA?.total ?? resumenManual.total
  const montoPagoMostrado = pagoTocado ? redondear(montoPago) : totalOficial

  const archivoABase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve((reader.result as string).split(",")[1] ?? ""); reader.onerror = reject; reader.readAsDataURL(file) })

  async function aplicarDatosFacturaIA(datos: Awaited<ReturnType<typeof leerFacturaConIA>>) {
    setTotalesIA({ subtotalBruto: datos.subtotal_bruto, descuentoTotal: datos.descuento_total, subtotalNeto: datos.subtotal_neto, ivaTotal: datos.iva_total, impuestosInternosTotal: datos.impuestos_internos_total, total: datos.total })
    setCargos((datos.cargos ?? []).map((cargo) => ({ descripcion: cargo.descripcion, importe: numero(cargo.importe) })))
    if (datos.numero) setNumeroFactura(datos.numero)
    if (datos.fecha) setFecha(datos.fecha)
    if (datos.fecha_vencimiento) setFechaVencimiento(datos.fecha_vencimiento)
    let proveedorDetectadoId = proveedorId
    if (datos.proveedor_nombre) {
      const nombreIA = datos.proveedor_nombre.toLowerCase().trim()
      const proveedorEncontrado = proveedores.find((p) => { const nombre = p.nombre_fantasia.toLowerCase().trim(); return nombre.includes(nombreIA) || nombreIA.includes(nombre) })
      if (proveedorEncontrado) { proveedorDetectadoId = proveedorEncontrado.id; setProveedorId(proveedorEncontrado.id) }
    }
    if (datos.lineas.length > 0) {
      const lineasProcesadas = await procesarLineasFacturaConIA(proveedorDetectadoId || null, datos.lineas, productos.map((p) => ({ id: p.id, nombre: p.nombre })))
      setLineas(lineasProcesadas)
    }
  }

  async function manejarArchivoIA(file: File) {
    setLeyendoIA(true); setErrorIA(null); setFallbackIA(null); setTotalesIA(null)
    try { const base64 = await archivoABase64(file); await aplicarDatosFacturaIA(await leerFacturaConIA(base64, file.type)) }
    catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo leer la factura."
      if (mensaje.startsWith("GEMINI_FALLBACK_REQUIRED|")) {
        const partes = mensaje.split("|"); const logId = partes[1] || null; const motivo = partes.slice(2).join("|") || "Gemini no pudo procesar el documento."
        try { const base64 = await archivoABase64(file); setFallbackIA({ base64, mimeType: file.type, logId, mensaje: motivo }); setErrorIA(null) }
        catch { setErrorIA("No se pudo preparar el documento para el procesamiento alternativo.") }
      } else setErrorIA(mensaje)
    } finally { setLeyendoIA(false); if (inputArchivoRef.current) inputArchivoRef.current.value = "" }
  }

  async function autorizarGPT() {
    if (!fallbackIA) return
    setLeyendoIA(true); setErrorIA(null); setTotalesIA(null)
    try { const datos = await usarGPTParaFactura(fallbackIA.base64, fallbackIA.mimeType, fallbackIA.logId); await aplicarDatosFacturaIA(datos); setFallbackIA(null) }
    catch (error) { setErrorIA(error instanceof Error ? error.message : "No se pudo procesar el documento con GPT-4o-mini.") }
    finally { setLeyendoIA(false) }
  }

  return (
    <form action={crearFactura} className="space-y-6">
      <input type="hidden" name="empresa_id" value={empresaActivaId ?? ""} />
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />
      <input type="hidden" name="subtotal" value={subtotalMostrado} />
      <input type="hidden" name="iva" value={ivaMostrado} />
      <input type="hidden" name="total" value={totalOficial} />
      <input type="hidden" name="ia_subtotal_bruto" value={totalesIA?.subtotalBruto ?? ""} />
      <input type="hidden" name="ia_descuento_total" value={totalesIA?.descuentoTotal ?? ""} />
      <input type="hidden" name="ia_subtotal_neto" value={totalesIA?.subtotalNeto ?? ""} />
      <input type="hidden" name="ia_iva_total" value={totalesIA?.ivaTotal ?? ""} />
      <input type="hidden" name="ia_impuestos_internos_total" value={totalesIA?.impuestosInternosTotal ?? ""} />
      <input type="hidden" name="ia_total" value={totalesIA?.total ?? ""} />
      <input type="hidden" name="cargos" value={JSON.stringify(cargos)} />
      <CargaIA inputArchivoRef={inputArchivoRef} leyendoIA={leyendoIA} errorIA={errorIA} manejarArchivoIA={manejarArchivoIA} />

      {fallbackIA && <div className="rounded-xl border border-amber-300 bg-amber-50 p-5"><div className="mb-3"><h3 className="text-base font-semibold text-amber-900">⚠️ Gemini no pudo procesar el documento</h3><p className="mt-1 text-sm text-amber-800">{fallbackIA.mensaje}</p></div><p className="mb-4 text-sm text-gray-700">Podés intentar procesarlo con <strong>GPT-4o-mini</strong> como alternativa.</p><div className="flex gap-3"><button type="button" onClick={autorizarGPT} disabled={leyendoIA} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{leyendoIA ? "Procesando con GPT..." : "Usar GPT-4o-mini"}</button><button type="button" onClick={() => { setFallbackIA(null); setErrorIA(null) }} disabled={leyendoIA} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button></div></div>}

      <DatosComprobante proveedores={proveedores} empresas={empresas} empresaActivaId={empresaActivaId} proveedorId={proveedorId} setProveedorId={setProveedorId} numero={numeroFactura} setNumero={setNumeroFactura} fecha={fecha} setFecha={setFecha} fechaVencimiento={fechaVencimiento} setFechaVencimiento={setFechaVencimiento} />
      <ProductosFactura productos={productosDisponibles} lineas={lineas} agregarLinea={agregarLinea} quitarLinea={quitarLinea} actualizarLinea={actualizarLinea} actualizarProductoDeLinea={actualizarProductoDeLinea} crearProductoDesdeLinea={async (index, nombre) => crearProductoDesdeLinea(index, nombre)} />
      <ImpuestosFactura subtotal={subtotalMostrado} descuentos={descuentosMostrados} iva={ivaMostrado} impuestosInternos={impuestosInternosMostrados} cargos={cargos} total={totalOficial} />
      <PagoFactura pagarAlCargar={pagarAlCargar} setPagarAlCargar={setPagarAlCargar} montoPagoMostrado={montoPagoMostrado} setMontoPago={setMontoPago} setPagoTocado={setPagoTocado} total={totalOficial} formasPago={formasPago} />
      <button type="submit" disabled={lineas.length === 0 || !empresaActivaId} className="rounded-lg bg-black px-5 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">Guardar factura</button>
    </form>
  )
}
