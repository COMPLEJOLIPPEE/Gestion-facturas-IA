'use client'

type Producto = { id: string; nombre: string; codigo: string | null; marca?: string | null; categoria?: string | null }
type CargoLinea = { descripcion: string; importe: number }
export type LineaFactura = {
  producto_id: string; cantidad: number; precio_unitario: number; iva: number; descuento: number; precio_final: number
  bonificacion?: number; cantidad_bonificada?: number; cantidad_bonificada_detalle?: number; tipo_bonificacion?: "cantidad" | "importe" | "porcentaje"
  precio_bruto_unitario?: number; precio_neto?: number; subtotal_neto?: number; impuestos_internos?: number; iva_importe?: number
  cargos?: CargoLinea[]; columnas_presentes?: string[]
  codigo_proveedor?: string; descripcion_proveedor?: string; descripcionLeida?: string; autoMatcheado?: boolean; score?: number
  confianza?: "alta" | "media" | "baja"; motivo?: string; aprendido?: boolean; fuente?: "alias" | "smartmatch" | "manual"
  producto_sugerido_id?: string; producto_sugerido_nombre?: string; tipo_linea?: "producto" | "ajuste"; es_ajuste_negativo?: boolean
}

type Props = {
  productos: Producto[]; lineas: LineaFactura[]; agregarLinea: () => void; quitarLinea: (index: number) => void
  actualizarLinea: (index: number, campo: keyof LineaFactura, valor: string | number | boolean) => void
  actualizarProductoDeLinea: (index: number, productoId: string) => void
  crearProductoDesdeLinea: (index: number, nombre: string, costo: number, iva: number) => Promise<void>
}

const ETIQUETAS: Record<string, string> = {
  cantidad: "Cant.", descripcion: "Producto", codigo: "Código", precio_unitario: "P. Unit.", descuento: "Dto.", bonificacion: "Bonif.",
  precio_neto_unitario: "P. Neto", iva: "IVA %", iva_importe: "IVA $", impuestos_internos: "Imp. Int.", cargo: "Cargo", subtotal_neto: "Subtotal", importe: "Importe"
}
function dinero(valor: number) { return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function numero(valor: unknown) { const n = Number(valor ?? 0); return Number.isFinite(n) ? n : 0 }

function columnasFallback(lineas: LineaFactura[]) {
  const columnas = new Set<string>(["descripcion", "cantidad", "precio_unitario"])
  for (const l of lineas) {
    if (numero(l.descuento) !== 0) columnas.add("descuento")
    if (numero(l.bonificacion) !== 0 || numero(l.cantidad_bonificada) !== 0) columnas.add("bonificacion")
    if (l.precio_neto != null) columnas.add("precio_neto_unitario")
    if (l.iva != null) columnas.add("iva")
    if (numero(l.iva_importe) !== 0) columnas.add("iva_importe")
    if (numero(l.impuestos_internos) !== 0) columnas.add("impuestos_internos")
    if (l.cargos?.length) columnas.add("cargo")
    if (l.subtotal_neto != null) columnas.add("subtotal_neto")
  }
  return Array.from(columnas)
}

export default function ProductosFactura({ productos, lineas, agregarLinea, quitarLinea, actualizarLinea, actualizarProductoDeLinea, crearProductoDesdeLinea }: Props) {
  const columnas = lineas.find((l) => l.columnas_presentes?.length)?.columnas_presentes ?? columnasFallback(lineas)
  const tiene = (clave: string) => columnas.includes(clave)
  const tasasIVA = Array.from(new Set(lineas.filter((l) => l.tipo_linea !== "ajuste" && !l.es_ajuste_negativo).map((l) => numero(l.iva)).filter((v) => v >= 0)))
  const ivaUnicoOculto = !tiene("iva") && tasasIVA.length === 1

  const cambiarIVAUnico = (valor: number) => {
    lineas.forEach((linea, index) => {
      if (linea.tipo_linea !== "ajuste" && !linea.es_ajuste_negativo) actualizarLinea(index, "iva", valor)
    })
  }

  return <div className="rounded-xl bg-white p-6 shadow">
    <div className="mb-6 flex items-center justify-between">
      <div><h2 className="text-xl font-semibold">Productos</h2><p className="mt-1 text-sm text-gray-500">La tabla respeta las columnas que realmente aparecen en la factura.</p></div>
      <button type="button" onClick={agregarLinea} className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">+ Agregar producto</button>
    </div>

    {ivaUnicoOculto && <div className="mb-4 flex items-center justify-end gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
      <span className="font-medium text-blue-900">IVA aplicado a las líneas</span>
      <select value={tasasIVA[0]} onChange={(e) => cambiarIVAUnico(Number(e.target.value))} className="rounded border border-blue-300 bg-white p-2 font-medium">
        <option value={21}>21%</option><option value={10.5}>10,5%</option><option value={27}>27%</option><option value={5}>5%</option><option value={2.5}>2,5%</option><option value={0}>0%</option>
      </select>
    </div>}

    {lineas.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">Todavía no hay productos cargados.</div>}

    {lineas.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm">
      <thead><tr className="border-b text-xs font-semibold uppercase tracking-wide text-gray-500">
        {columnas.map((col) => <th key={col} className="px-2 py-3 text-right first:text-left">{ETIQUETAS[col] ?? col}</th>)}
        <th className="w-10" />
      </tr></thead>
      <tbody>
        {lineas.map((linea, index) => {
          const ajuste = linea.tipo_linea === "ajuste" || linea.es_ajuste_negativo === true
          const cantidad = numero(linea.cantidad)
          const precio = numero(linea.precio_bruto_unitario ?? linea.precio_unitario)
          const descuento = Math.abs(numero(linea.descuento))
          const bonificacion = Math.abs(numero(linea.bonificacion)) + (linea.tipo_bonificacion === "cantidad" ? numero(linea.cantidad_bonificada) * Math.abs(precio) : 0)
          const subtotal = linea.subtotal_neto != null ? numero(linea.subtotal_neto) : ajuste ? -Math.abs(cantidad * precio) : Math.max(0, cantidad * Math.abs(precio) - descuento - bonificacion)
          const precioNeto = linea.precio_neto != null ? numero(linea.precio_neto) : cantidad ? subtotal / cantidad : precio
          const iva = numero(linea.iva_importe) || subtotal * numero(linea.iva) / 100
          const internos = numero(linea.impuestos_internos)
          const cargos = (linea.cargos ?? []).reduce((s, c) => s + numero(c.importe), 0)
          const importe = linea.subtotal_neto != null ? subtotal + iva + internos : subtotal + iva + internos + cargos
          const celda = (col: string) => {
            if (col === "descripcion") return <div className="min-w-[260px] text-left">
              {ajuste ? <div className="rounded-lg border border-red-200 bg-red-50 p-3"><span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white">DESCUENTO / AJUSTE</span><p className="mt-2 font-semibold text-red-900">{linea.descripcionLeida || "Descuento del comprobante"}</p><p className="mt-1 text-xs text-red-700">Línea independiente · no se asocia a ningún producto.</p></div> : <>
                <select value={linea.producto_id} required onChange={(e) => actualizarProductoDeLinea(index, e.target.value)} className="w-full rounded-lg border border-gray-300 p-2"><option value="">Seleccionar producto...</option>{productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                {!linea.producto_id && !linea.producto_sugerido_id && linea.descripcionLeida && <button type="button" onClick={() => crearProductoDesdeLinea(index, linea.descripcionLeida ?? "", Math.abs(precioNeto), numero(linea.iva ?? 21))} className="mt-2 w-full rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white">+ Crear este producto</button>}
                {linea.confianza === "alta" && <p className="mt-2 rounded bg-green-50 p-2 text-xs text-green-700">🟢 {linea.score ?? 100}% · {linea.motivo}</p>}
                {linea.confianza === "media" && linea.producto_sugerido_id && <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700"><b>🟡 Sugerencia · {linea.score ?? 0}%</b><p>{linea.motivo}</p><button type="button" onClick={() => actualizarProductoDeLinea(index, linea.producto_sugerido_id!)} className="mt-2 rounded bg-yellow-500 px-2 py-1 text-white">✓ Usar sugerencia</button></div>}
                {linea.confianza === "baja" && <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">🔴 Producto no reconocido.</p>}
                {linea.descripcionLeida && <p className="mt-2 rounded bg-gray-100 p-2 text-xs">IA: {linea.descripcionLeida}</p>}
              </>}
            </div>
            if (col === "cantidad") return <input type="number" min="0" step="0.01" value={linea.cantidad} onChange={(e) => actualizarLinea(index, "cantidad", Number(e.target.value))} className="w-20 rounded border p-2 text-right" />
            if (col === "precio_unitario") return <input type="number" step="0.01" value={linea.precio_unitario} onChange={(e) => actualizarLinea(index, "precio_unitario", Number(e.target.value))} className="w-28 rounded border p-2 text-right" />
            if (col === "descuento") return <span className="block text-right">${dinero(descuento)}</span>
            if (col === "bonificacion") return <span className="block text-right">${dinero(bonificacion)}</span>
            if (col === "precio_neto_unitario") return <span className="block text-right font-medium">${dinero(precioNeto)}</span>
            if (col === "iva") return <select value={linea.iva} onChange={(e) => actualizarLinea(index, "iva", Number(e.target.value))} className="w-20 rounded border p-2"><option value={21}>21%</option><option value={10.5}>10,5%</option><option value={27}>27%</option><option value={5}>5%</option><option value={2.5}>2,5%</option><option value={0}>0%</option></select>
            if (col === "iva_importe") return <span className="block text-right">${dinero(iva)}</span>
            if (col === "impuestos_internos") return <span className="block text-right">${dinero(internos)}</span>
            if (col === "cargo") return <span className="block text-right">${dinero(cargos)}</span>
            if (col === "subtotal_neto") return <span className="block text-right font-medium">${dinero(subtotal)}</span>
            if (col === "importe") return <span className="block text-right font-semibold">${dinero(importe)}</span>
            if (col === "codigo") return <span>{linea.codigo_proveedor ?? "—"}</span>
            return <span>—</span>
          }
          return <tr key={index} className="border-b align-top hover:bg-gray-50">{columnas.map((col) => <td key={col} className="px-2 py-3">{celda(col)}</td>)}<td className="px-1 py-3"><button type="button" onClick={() => quitarLinea(index)} className="rounded px-2 py-2 text-red-600 hover:bg-red-50">✕</button></td></tr>
        })}
      </tbody>
    </table></div>}

    {lineas.length > 0 && <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">Las columnas en 0 se mantienen si aparecen en la factura original. Las columnas que no existen no se agregan.</div>}
  </div>
}
