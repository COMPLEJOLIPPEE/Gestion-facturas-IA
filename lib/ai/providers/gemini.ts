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
      : "Es un REMITO de compra argentino."

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
SIGUE siendo el precio unitario original impreso en la factura.
La bonificación debe quedar en descuento/bonificación y no modificar
precio_unitario.

Ejemplo:

Cantidad: 3
P.UNITARIO: 47.083,61
BONIF: 100%
SUBTOTAL NETO: 0,00

Debe devolverse:

cantidad = 3
precio_unitario = 47083.61
descuento = 141250.83
precio_final = 0

NO debe devolverse precio_unitario = 0 ni ningún importe tomado
del subtotal neto.

Si existen varias columnas numéricas cercanas, verificá primero
el encabezado de cada columna y asociá cada valor con su columna
antes de devolverlo.

El precio_unitario NUNCA debe ser negativo.

Si aparece un importe negativo asociado a un descuento,
NO lo interpretes como precio negativo.

==================================================
DESCUENTOS
==================================================

Los descuentos pueden aparecer de distintas maneras.

CASO 1:
El descuento aparece directamente en la línea del producto.

Ejemplo:

Producto X
Precio: 1000
Descuento: 100

En ese caso:

descuento = 100
precio_final = 900

--------------------------------------------------

CASO 2:
El descuento aparece como porcentaje.

Ejemplo:

Producto X
Precio: 1000

Descuento 10%

En ese caso:

descuento = 100
precio_final = 900

--------------------------------------------------

CASO 3:
El descuento aparece como una línea SEPARADA
que corresponde a un grupo o segmento de productos.

Ejemplo:

6 Producto A 500 ml
6 Producto B 500 ml
6 Producto C 500 ml

30% PRODUCTOS 500 ML

En este caso la línea "30% PRODUCTOS 500 ML"
NO es un producto.

Debe interpretarse como un descuento aplicado
a los productos del grupo correspondiente.

El descuento debe distribuirse entre los productos
que pertenecen a ese segmento.

--------------------------------------------------

CASO 4:
El descuento aparece como un importe negativo
en una línea separada.

Ejemplo:

Producto A
Producto B
Producto C
-38.380,01 DESCUENTO PRODUCTOS 500 ML

Ese importe negativo representa un descuento.

NO debe convertirse en un producto.

NO debe aparecer como un producto con precio negativo.

Debe distribuirse entre los productos correspondientes
al segmento.

--------------------------------------------------

REGLA PARA DISTRIBUIR DESCUENTOS DE SEGMENTO:

Primero identificá qué productos pertenecen al segmento.

Luego calculá el neto bruto de esos productos:

cantidad × precio_unitario

Después distribuí el descuento proporcionalmente
entre esos productos según su participación en el neto
del segmento.

Ejemplo:

Producto A = 10.000
Producto B = 20.000
Producto C = 30.000

Descuento del segmento = 12.000

Entonces:

Producto A → descuento 2.000
Producto B → descuento 4.000
Producto C → descuento 6.000

El total del descuento distribuido debe coincidir
con el descuento original del comprobante.

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

Conservá siempre el precio_unitario original de la línea.

Si el comprobante permite identificar la cantidad bonificada,
utilizá esa información para determinar el importe bonificado.

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
- precio_final debe representar el valor neto de la línea después del descuento.
- La suma de los descuentos de las líneas debe coincidir con el descuento total cuando sea posible determinarlo.

==================================================
IMPUESTOS Y PERCEPCIONES
==================================================

Prestá especial atención a las columnas y conceptos
que aparecen después del subtotal.

Pueden existir:

- IVA
- Impuestos internos
- Percepción IVA
- Percepción IIBB Buenos Aires
- Percepción IIBB CABA
- otras percepciones
- otros cargos

No confundas IVA con percepción de IVA.

No confundas impuestos internos con percepciones.

Los conceptos que no correspondan al precio de los productos
deben aparecer en "cargos".

Cada cargo debe contener:

descripcion
importe

Si el importe aparece negativo por la forma de impresión
del comprobante, interpretalo según el concepto.
Una percepción o impuesto cobrado debe quedar como importe positivo.

==================================================
IMPUESTOS INTERNOS
==================================================

Los impuestos internos pueden aparecer:

- por línea
- como columna
- como total al pie del comprobante.

Si aparecen como total separado y no están asociados
claramente a una línea específica, registralos como cargo
con una descripción clara, por ejemplo:

"Impuestos Internos"

No los confundas con IVA.

==================================================
VALIDACIÓN
==================================================

Antes de responder verificá matemáticamente:

subtotal_bruto
- descuento_total
= subtotal_neto

Cuando la información disponible lo permita.

También verificá:

subtotal_neto
+ IVA
+ impuestos/cargos
+ percepciones
≈ total

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
