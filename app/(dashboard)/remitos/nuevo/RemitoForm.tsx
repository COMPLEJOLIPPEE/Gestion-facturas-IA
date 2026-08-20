'use client'

import { useMemo, useRef, useState } from "react"

import { crearRemito } from "./actions"
import CargaIA from "./components/CargaIA"
import DatosComprobante from "./components/DatosComprobante"
import ProductosRemito, { LineaRemito } from "./components/ProductosRemito"
import PagoRemito from "./components/PagoRemito"
import { leerRemitoConIA } from "@/lib/ai/actions"
import { matchearProducto } from "@/lib/ai/matchear-producto"

type Proveedor = { id: string; nombre_fantasia: string }
type Empresa = { id: string; razon_social: string }
type Producto = { id: string; nombre: string; codigo: string | null }
type FormaPago = { id: string; nombre: string }

type Props = {
  proveedores: Proveedor[]
  empresas: Empresa[]
  productos: Producto[]
  formasPago: FormaPago[]
}

export function RemitoForm({ proveedores, empresas, productos, formasPago }: Props) {
  const [lineas, setLineas] = useState<LineaRemito[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [numero, setNumero] = useState("")
  const [fecha, setFecha] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [leyendoIA, setLeyendoIA] = useState(false)
  const [errorIA, setErrorIA] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [pagarAlCargar, setPagarAlCargar] = useState(false)
  const [montoPago, setMontoPago] = useState(0)
  const [pagoTocado, setPagoTocado] = useState(false)

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        producto_id: "",
        cantidad: 1,
        precio_unitario: 0,
        descuento: 0,
        bonificacion_importe: 0,
      },
    ])
  }

  const quitarLinea = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarLinea = (
    index: number,
    campo: keyof LineaRemito,
    valor: string | number
  ) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, [campo]: valor } : linea))
    )
  }

  const actualizarProductoDeLinea = (index: number, productoId: string) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, producto_id: productoId } : linea))
    )
  }

  const { subtotalBruto, descuentoTotal, bonificacionTotal, total } = useMemo(() => {
    let subtotalBruto = 0
    let descuentoTotal = 0
    let bonificacionTotal = 0

    lineas.forEach((linea) => {
      subtotalBruto += linea.cantidad * linea.precio_unitario
      descuentoTotal += Number(linea.descuento ?? 0)
      bonificacionTotal += Number(linea.bonificacion_importe ?? 0)
    })

    return {
      subtotalBruto,
      descuentoTotal,
      bonificacionTotal,
      total: Math.max(0, subtotalBruto - descuentoTotal - bonificacionTotal),
    }
  }, [lineas])

  const montoPagoMostrado = pagoTocado ? montoPago : total

  const archivoABase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  async function manejarArchivoIA(file: File) {
    setLeyendoIA(true)
    setErrorIA(null)

    try {
      const base64 = await archivoABase64(file)
      const datos = await leerRemitoConIA(base64, file.type)

      if (datos.proveedor_nombre) {
        const proveedor = matchearProducto(
          datos.proveedor_nombre,
          proveedores.map((p) => ({ id: p.id, nombre: p.nombre_fantasia }))
        )
        if (proveedor) setProveedorId(proveedor.id)
      }

      if (datos.numero) setNumero(datos.numero)
      if (datos.fecha) setFecha(datos.fecha)
      if (datos.fecha_vencimiento) setFechaVencimiento(datos.fecha_vencimiento)

      if (datos.lineas.length > 0) {
        setLineas(
          datos.lineas.map((l) => {
            const match = matchearProducto(l.descripcion, productos)
            const bruto = Number(l.cantidad || 1) * Number(l.precio_unitario || 0)
            const descuento = Number(l.descuento ?? 0)
            const precioNeto = Math.max(0, Number(l.precio_final ?? bruto - descuento))
            const bonificacionImporte = Math.max(0, bruto - descuento - precioNeto)

            return {
              producto_id: match?.id ?? "",
              cantidad: l.cantidad || 1,
              precio_unitario: l.precio_unitario || 0,
              descuento,
              bonificacion_importe: bonificacionImporte,
              porcentaje_descuento: l.porcentaje_descuento ?? null,
              bonificacion_tipo: l.grupo_descuento ?? null,
              cantidad_bonificada: null,
              descripcionLeida: l.descripcion,
              autoMatcheado: Boolean(match),
              precio_final: precioNeto,
            }
          })
        )
      }
    } catch (error) {
      setErrorIA(error instanceof Error ? error.message : "No se pudo leer el comprobante.")
    } finally {
      setLeyendoIA(false)
      if (inputArchivoRef.current) inputArchivoRef.current.value = ""
    }
  }

  return (
    <form action={crearRemito} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lineas)} />
      <input type="hidden" name="subtotal_bruto" value={subtotalBruto} />
      <input type="hidden" name="descuento_total" value={descuentoTotal} />
      <input type="hidden" name="bonificacion_total" value={bonificacionTotal} />
      <input type="hidden" name="total" value={total} />

      <CargaIA
        inputArchivoRef={inputArchivoRef}
        leyendoIA={leyendoIA}
        errorIA={errorIA}
        manejarArchivoIA={manejarArchivoIA}
      />

      <DatosComprobante
        proveedores={proveedores}
        empresas={empresas}
        proveedorId={proveedorId}
        setProveedorId={setProveedorId}
        numero={numero}
        setNumero={setNumero}
        fecha={fecha}
        setFecha={setFecha}
        fechaVencimiento={fechaVencimiento}
        setFechaVencimiento={setFechaVencimiento}
      />

      <ProductosRemito
        productos={productos}
        lineas={lineas}
        agregarLinea={agregarLinea}
        quitarLinea={quitarLinea}
        actualizarLinea={actualizarLinea}
        actualizarProductoDeLinea={actualizarProductoDeLinea}
      />

      <PagoRemito
        pagarAlCargar={pagarAlCargar}
        setPagarAlCargar={setPagarAlCargar}
        montoPagoMostrado={montoPagoMostrado}
        setMontoPago={setMontoPago}
        setPagoTocado={setPagoTocado}
        total={total}
        formasPago={formasPago}
      />

      <button
        type="submit"
        disabled={lineas.length === 0}
        className="rounded-lg bg-black px-5 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar remito
      </button>
    </form>
  )
}
