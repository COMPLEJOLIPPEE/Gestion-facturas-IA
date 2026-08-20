import { GoogleGenAI } from "@google/genai"
import type {
  ComprobanteExtraido,
  TipoComprobanteIA,
} from "../tipos"

import { schema } from "./schema"

function isServiceUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false

  const { code, message } = error as {
    code?: unknown
    message?: unknown
  }

  return (
    code === 503 ||
    (
      typeof message === "string" &&
      message.includes("UNAVAILABLE")
    )
  )
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (isServiceUnavailable(error)) {
        await new Promise((res) => setTimeout(res, delayMs))
      } else {
        throw error
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini no respondió tras varios intentos")
}

export async function extraerConGemini(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error("Falta la variable de entorno GEMINI_API_KEY")
  }

  const ai = new GoogleGenAI({ apiKey })
  const modelo = process.env.GEMINI_MODEL || "gemini-3.5-flash"

  const contexto =
    tipo === "factura"
      ? "Es una FACTURA de compra argentina."
      : "Es un REMITO de compra argentino. Un remito no lleva IVA, impuestos internos ni percepciones. Puede contener descuentos y bonificaciones comerciales. IVA debe devolverse como null y los impuestos/percepciones como 0 o no informados."

  const prompt = `
Sos un analista experto en comprobantes de compra de Argentina.

${contexto}

Analizá TODO el documento antes de responder.

Devolvé únicamente un JSON válido siguiendo exactamente el schema recibido.

==================================================
DATOS GENERALES
==================================================

Identificá:

- proveedor
- número de comprobante
- fecha
- fecha de vencimiento
- subtotal bruto
- descuento total
- subtotal neto
- IVA total
- otros cargos, impuestos y percepciones
- total final

No inventes información.

Si un dato no aparece o no puede determinarse con seguridad,
devolvé null.

Las fechas deben estar en formato YYYY-MM-DD.

Todos los importes deben ser números.

==================================================
PRODUCTOS
==================================================

Para cada producto real del comprobante identificá:

- descripcion
- codigo_proveedor
- cantidad
- precio_unitario
- iva
- descuento
- porcentaje_descuento
- bonificacion_importe
- bonificacion_tipo
- cantidad_bonificada
- precio_bruto_unitario
- precio_neto_unitario
- subtotal_neto
- precio_final

==================================================
REGLA CRÍTICA: PRECIO UNITARIO
==================================================

"precio_unitario" DEBE ser exclusivamente el importe que aparece
impreso en la columna/campo "P.UNITARIO", "PRECIO UNIT.", "UNIT. NETO"
o equivalente que represente el precio unitario del producto ANTES
de aplicar el descuento o bonificación.

NO uses para precio_unitario:

- subtotal de la línea
- subtotal neto
- importe total de la línea
- IVA
- impuestos internos
- precio neto después del descuento
- precio de otro producto
- ningún importe obtenido de otra columna

Si una línea tiene una bonificación del 100%, el precio_unitario
SIGUE siendo el precio unitario original impreso en el comprobante.
La bonificación debe quedar separada y no modificar precio_unitario.

El precio_unitario NUNCA debe ser negativo.

Si aparece un importe negativo asociado a un descuento,
NO lo interpretes como precio negativo.

==================================================
DESCUENTOS
==================================================

Los descuentos pueden aparecer de distintas maneras.

CASO 1:
El descuento aparece directamente en la línea del producto.

Producto X
Precio: 1000
Descuento: 100

En ese caso:

descuento = 100
precio_final = 900

--------------------------------------------------

CASO 2:
El descuento aparece como porcentaje.

Producto X
Precio: 1000
Descuento 10%

En ese caso:

descuento = 100
porcentaje_descuento = 10
precio_final = 900

--------------------------------------------------

CASO 3:
El descuento aparece como una línea SEPARADA
que corresponde a un grupo o segmento de productos.

La línea de descuento NO es un producto.
Debe distribuirse proporcionalmente entre los productos
correspondientes al segmento.

--------------------------------------------------

CASO 4:
El descuento aparece como un importe negativo
en una línea separada.

Ese importe representa un descuento.
NO debe convertirse en un producto.
Debe distribuirse entre los productos correspondientes.

--------------------------------------------------

REGLA PARA DISTRIBUIR DESCUENTOS DE SEGMENTO:

Primero identificá qué productos pertenecen al segmento.

Luego calculá el bruto de esos productos:

cantidad × precio_unitario

Después distribuí el descuento proporcionalmente
según la participación de cada producto en el bruto del segmento.

El total del descuento distribuido debe coincidir
con el descuento original del comprobante cuando sea posible.

==================================================
BONIFICACIONES
==================================================

También pueden existir bonificaciones comerciales por cantidad,
por ejemplo:

- 3 unidades y 1 bonificada
- 5 unidades y 1 bonificada
- 5 unidades y 2 bonificadas
- bonificación 100%

No conviertas la bonificación en un producto separado.

Conservá siempre el precio_unitario original.

Si el comprobante permite identificar la cantidad bonificada,
utilizá esa información.

Cuando pueda determinarse:

cantidad_bonificada = cantidad de unidades regaladas
bonificacion_importe = precio correspondiente a esas unidades
bonificacion_tipo = descripción breve, por ejemplo "3x2", "5x4" o "100%"

==================================================
REGLAS IMPORTANTES DE DESCUENTOS Y BONIFICACIONES
==================================================

- Nunca inventes descuentos.
- Nunca conviertas una línea de descuento en producto.
- Nunca pongas un precio_unitario negativo.
- Si el descuento aparece negativo, utilizá su valor absoluto.
- Si el descuento aparece como porcentaje, calculá su importe.
- Si el descuento corresponde a un grupo, distribuílo proporcionalmente.
- Si existe bonificación por cantidad, conservá el precio unitario original.
- Si no existe descuento, descuento debe ser 0.
- Si no existe bonificación, bonificacion_importe debe ser 0.
- precio_neto_unitario debe representar el costo neto por unidad luego de descuentos y bonificaciones.
- subtotal_neto debe representar cantidad × precio_neto_unitario.
- precio_final debe representar el subtotal neto de la línea.

==================================================
IMPUESTOS Y PERCEPCIONES
==================================================

Para FACTURAS, prestá especial atención a:

- IVA
- Impuestos internos
- Percepción IVA
- Percepción IIBB Buenos Aires
- Percepción IIBB CABA
- otras percepciones
- otros cargos

No confundas IVA con percepción de IVA.
No confundas impuestos internos con percepciones.

Para REMITOS:

- no agregues IVA
- no agregues impuestos internos
- no agregues percepciones
- no inventes cargos fiscales

Los conceptos fiscales solo deben aparecer cuando realmente estén
informados en una FACTURA.

==================================================
IMPUESTOS INTERNOS
==================================================

Los impuestos internos pueden aparecer por línea, como columna
o como total al pie de una FACTURA.

Si aparecen como total separado y no están asociados claramente
a una línea específica, registralos como cargo con una descripción clara.

==================================================
VALIDACIÓN
==================================================

Antes de responder verificá matemáticamente cuando la información
lo permita:

subtotal_bruto
- descuento_total
= subtotal_neto

Para facturas:
subtotal_neto
+ IVA
+ impuestos/cargos
+ percepciones
≈ total

Para remitos:
subtotal_bruto
- descuento_total
- bonificaciones
= subtotal_neto
= total cuando no existan otros conceptos comerciales.

Puede existir una diferencia mínima por redondeos.

IMPORTANTE:
Si el precio unitario leído de la columna correspondiente
no coincide con el subtotal porque existe una bonificación,
NO corrijas el precio unitario para hacerlo coincidir.
El precio unitario debe conservar el valor impreso.

==================================================
IMPORTANTE FINAL

No agregues explicaciones.
No agregues texto fuera del JSON.
Respondé únicamente el JSON solicitado.
`

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelo,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    })
  )

  const texto = response.text

  if (!texto) {
    throw new Error("Gemini no devolvió contenido")
  }

  const data = JSON.parse(texto) as ComprobanteExtraido

  return {
    proveedor_nombre: data.proveedor_nombre ?? null,
    numero: data.numero ?? null,
    fecha: data.fecha ?? null,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    subtotal_bruto: data.subtotal_bruto ?? null,
    descuento_total: data.descuento_total ?? null,
    subtotal_neto: data.subtotal_neto ?? null,
    iva_total: data.iva_total ?? null,
    cargos: (data.cargos ?? []).map((cargo) => ({
      descripcion: cargo.descripcion,
      importe: Math.abs(Number(cargo.importe ?? 0)),
    })),
    total: data.total ?? null,
    lineas: (data.lineas ?? []).map((l) => ({
      descripcion: l.descripcion,
      cantidad: Number(l.cantidad ?? 0),
      precio_unitario: Math.abs(Number(l.precio_unitario ?? 0)),
      iva: l.iva ?? null,
      descuento: Math.abs(Number(l.descuento ?? 0)),
      porcentaje_descuento: l.porcentaje_descuento ?? null,
      bonificacion_importe: Math.abs(Number(l.bonificacion_importe ?? 0)),
      bonificacion_tipo: l.bonificacion_tipo ?? null,
      cantidad_bonificada: l.cantidad_bonificada ?? null,
      precio_bruto_unitario: l.precio_bruto_unitario ?? null,
      precio_neto_unitario: l.precio_neto_unitario ?? null,
      subtotal_neto: l.subtotal_neto ?? null,
      precio_final: l.precio_final ?? null,
      codigo_proveedor: l.codigo_proveedor ?? null,
      producto_id: undefined,
      score: undefined,
      confianza: undefined,
      motivo: undefined,
      fuente: undefined,
    })),
  }
}
