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
        await new Promise((res) =>
          setTimeout(res, delayMs)
        )
      } else {
        throw error
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Gemini no respondió tras varios intentos"
      )
}

export async function extraerConGemini(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {

  const apiKey =
    process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error(
      "Falta la variable de entorno GEMINI_API_KEY"
    )
  }

  const ai =
    new GoogleGenAI({ apiKey })

  const modelo =
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash"

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
- impuestos internos
- percepciones
- otros cargos
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
- cantidad_bonificada
- precio_unitario
- descuento
- porcentaje_descuento
- descuentos
- grupo_descuento
- bonificacion
- tipo_bonificacion
- cantidad_bonificada_detalle
- precio_neto
- precio_final
- subtotal_neto
- iva
- iva_importe
- impuestos_internos

IMPORTANTE:

"precio_unitario" representa el precio original
ANTES de descuentos y bonificaciones.

Nunca pongas un precio_unitario negativo.

==================================================
IVA POR PRODUCTO
==================================================

El campo "iva" representa la ALICUOTA de IVA en porcentaje.
Ejemplos válidos: 21, 10.5, 27, 0.

El campo "iva_importe" representa el IMPORTE de IVA de esa línea.

Si la alícuota no aparece junto a cada producto pero aparece en el
pie de la factura, utilizá esa alícuota para los productos cuando
la estructura de la factura indique que corresponde a todas las líneas.

Ejemplo:

Subtotal neto = 681502.60
IVA = 71557.77

71557.77 / 681502.60 = 10.5%

En ese caso:

iva = 10.5
iva_importe = 71557.77

No dejes "iva" en null si la alícuota puede determinarse claramente
a partir del comprobante y de sus totales.

Si existen varias alícuotas y no puede determinarse con seguridad
qué productos corresponden a cada una, dejá la alícuota de esas
líneas en null y conservá el IVA total real.

==================================================
TIPOS DE DESCUENTO Y BONIFICACIÓN
==================================================

Existen TRES mecanismos principales:

1. DESCUENTO POR PORCENTAJE EN UNA LÍNEA

Ejemplo:

Producto X
Precio: 1000
DTO 10%

Entonces:

precio_unitario = 1000
porcentaje_descuento = 10
descuento = 100
precio_neto = 900

--------------------------------------------------

2. DESCUENTO POR PORCENTAJE DE UN GRUPO

Ejemplo:

Producto A
Producto B
Producto C

30% PRODUCTOS BEBIDAS

La línea del descuento NO es un producto.

Identificá los productos pertenecientes al grupo.

Usá:

grupo_descuento

para identificar el grupo.

Distribuí el descuento proporcionalmente
según el valor bruto de cada producto.

Ejemplo:

Producto A = 10.000
Producto B = 20.000
Producto C = 30.000

Descuento grupo = 12.000

Entonces:

Producto A → 2.000
Producto B → 4.000
Producto C → 6.000

--------------------------------------------------

3. BONIFICACIÓN

Una bonificación puede aparecer:

- como porcentaje
- como importe
- como cantidad de unidades sin cargo

Ejemplo:

BON 50%

o:

5 + 1 BONIFICADO

En el caso de unidades bonificadas:

cantidad = cantidad total entregada

cantidad_bonificada = unidades entregadas sin cargo

cantidad_bonificada_detalle = cantidad bonificada cuando pueda determinarse

tipo_bonificacion = "cantidad"

NO conviertas una bonificación por cantidad
en un descuento porcentual ficticio.

==================================================
MÚLTIPLES DESCUENTOS
==================================================

Una factura puede tener varios descuentos sucesivos.

Ejemplo:

DTO 15%
DTO 10%
DTO 0,50%

NO sumes automáticamente:

15 + 10 + 0,50 = 25,50%

Los descuentos sucesivos deben calcularse uno después del otro.

Ejemplo:

Precio = 1000

15% → 850

10% sobre 850 → 765

0,50% sobre 765 → 761,175

El resultado debe reflejar el precio neto real.

Guardá cada descuento dentro de:

descuentos[]

Cada elemento debe contener:

porcentaje
importe
descripcion

==================================================
REGLAS DE DESCUENTOS
==================================================

- Nunca inventes descuentos.
- Nunca conviertas una línea de descuento en producto.
- Nunca pongas un precio_unitario negativo.
- Si el descuento aparece negativo, utilizá su valor absoluto.
- Si aparece como porcentaje, calculá su importe.
- Si corresponde a un grupo, distribuílo proporcionalmente.
- Si existen varios descuentos sucesivos, NO los sumes.
- Conservá cada descuento individual.
- Si no existe descuento, descuento = 0.
- precio_neto debe representar el precio después
  de descuentos y bonificaciones.
- precio_final debe mantenerse igual al precio_neto
  para compatibilidad con el sistema actual.

==================================================
IVA
==================================================

REGLA IMPORTANTE:

En las facturas analizadas, normalmente el IVA
se calcula DESPUÉS de los descuentos.

Por lo tanto:

precio bruto
- descuentos / bonificaciones
= precio neto

precio neto
× alícuota IVA
= IVA

No calcules IVA sobre el precio bruto
si la factura muestra claramente que la base imponible
es el precio después del descuento.

Si la factura presenta una estructura diferente,
respetá la información real del comprobante.

==================================================
IMPUESTOS INTERNOS
==================================================

Los impuestos internos pueden aparecer:

- por producto
- como columna
- como total al pie.

Si están claramente asociados a una línea:

impuestos_internos = importe de esa línea.

Si solamente aparece un total general
sin poder determinar su distribución:

NO inventes una distribución.

En ese caso registralo como cargo:

descripcion = "Impuestos Internos"

No confundas impuestos internos con IVA.

No confundas impuestos internos con percepciones.

==================================================
PERCEPCIONES Y OTROS CARGOS
==================================================

Pueden existir:

- Percepción IVA
- Percepción IIBB Buenos Aires
- Percepción IIBB CABA
- otras percepciones
- otros impuestos
- otros cargos

Estos conceptos deben ir en:

cargos[]

Cada cargo debe contener:

descripcion
importe

Una percepción cobrada debe quedar como importe positivo.

==================================================
CÁLCULOS
==================================================

Cuando la información permita calcularlo:

subtotal_bruto
-
descuentos y bonificaciones
=
subtotal_neto

Luego:

subtotal_neto
+
IVA
+
impuestos internos
+
percepciones
+
otros cargos
≈
total

Puede existir una diferencia mínima por redondeo.

==================================================
VALIDACIÓN
==================================================

Antes de responder verificá:

1. Que las cantidades sean correctas.
2. Que ningún precio unitario sea negativo.
3. Que los descuentos no se conviertan en productos.
4. Que las bonificaciones por cantidad sean identificadas.
5. Que los descuentos sucesivos no se sumen incorrectamente.
6. Que el IVA se calcule sobre la base correcta.
7. Que los impuestos internos no se confundan con percepciones.
8. Que el total sea coherente con los importes del comprobante.

No inventes información.

Si un cálculo no puede determinarse con seguridad,
devolvé null.

==================================================

IMPORTANTE FINAL

No agregues explicaciones.

No agregues texto fuera del JSON.

Respondé únicamente el JSON solicitado.
`

  const response =
    await withRetry(() =>
      ai.models.generateContent({
        model: modelo,

        contents: [
          {
            role: "user",

            parts: [
              {
                text: prompt,
              },

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
          responseMimeType:
            "application/json",

          responseSchema:
            schema,
        },
      })
    )

  const texto =
    response.text

  if (!texto) {
    throw new Error(
      "Gemini no devolvió contenido"
    )
  }

  const data =
    JSON.parse(texto) as ComprobanteExtraido

  const lineasBase = data.lineas ?? []

  const ivaInformado = lineasBase.some(
    (linea) =>
      linea.iva != null &&
      Number.isFinite(Number(linea.iva))
  )

  let tasaIVADerivada: number | null = null

  if (
    !ivaInformado &&
    data.iva_total != null &&
    data.subtotal_neto != null &&
    Number(data.subtotal_neto) > 0
  ) {
    const tasa =
      (Number(data.iva_total) /
        Number(data.subtotal_neto)) * 100

    const tasasValidas = [
      0,
      2.5,
      5,
      10.5,
      21,
      27,
    ]

    tasaIVADerivada =
      tasasValidas.find(
        (valor) =>
          Math.abs(tasa - valor) < 0.15
      ) ?? null
  }

  return {

    proveedor_nombre:
      data.proveedor_nombre ?? null,

    numero:
      data.numero ?? null,

    fecha:
      data.fecha ?? null,

    fecha_vencimiento:
      data.fecha_vencimiento ?? null,

    subtotal_bruto:
      data.subtotal_bruto ?? null,

    descuento_total:
      data.descuento_total ?? null,

    subtotal_neto:
      data.subtotal_neto ?? null,

    iva_total:
      data.iva_total ?? null,

    cargos:
      (data.cargos ?? []).map((cargo) => ({
        descripcion:
          cargo.descripcion,

        importe:
          Math.abs(
            Number(cargo.importe ?? 0)
          ),
      })),

    total:
      data.total ?? null,

    lineas:
      lineasBase.map((l) => {
        const subtotalNeto =
          l.subtotal_neto != null
            ? Number(l.subtotal_neto)
            : null

        const ivaDerivado =
          l.iva ?? tasaIVADerivada

        return {
          descripcion:
            l.descripcion,

          cantidad:
            Number(l.cantidad ?? 0),

          cantidad_bonificada:
            l.cantidad_bonificada ?? null,

          precio_unitario:
            Math.abs(
              Number(
                l.precio_unitario ?? 0
              )
            ),

          descuento:
            Math.abs(
              Number(
                l.descuento ?? 0
              )
            ),

          porcentaje_descuento:
            l.porcentaje_descuento ?? null,

          tipo_descuento:
            l.tipo_descuento ?? null,

          descuentos:
            (l.descuentos ?? []).map(
              (descuento) => ({
                porcentaje:
                  descuento.porcentaje ?? null,

                importe:
                  descuento.importe != null
                    ? Math.abs(
                        Number(
                          descuento.importe
                        )
                      )
                    : null,

                descripcion:
                  descuento.descripcion ?? null,
              })
            ),

          grupo_descuento:
            l.grupo_descuento ?? null,

          bonificacion:
            l.bonificacion != null
              ? Math.abs(
                  Number(l.bonificacion)
                )
              : null,

          tipo_bonificacion:
            l.tipo_bonificacion ?? null,

          cantidad_bonificada_detalle:
            l.cantidad_bonificada_detalle ?? null,

          precio_neto:
            l.precio_neto != null
              ? Number(l.precio_neto)
              : null,

          precio_final:
            l.precio_final != null
              ? Number(l.precio_final)
              : null,

          subtotal_neto:
            subtotalNeto,

          iva:
            ivaDerivado,

          iva_importe:
            l.iva_importe != null
              ? Number(l.iva_importe)
              : tasaIVADerivada != null && subtotalNeto != null
                ? subtotalNeto * (tasaIVADerivada / 100)
                : null,

          impuestos_internos:
            l.impuestos_internos != null
              ? Math.abs(
                  Number(
                    l.impuestos_internos
                  )
                )
              : null,

          codigo_proveedor:
            l.codigo_proveedor ?? null,

          producto_id:
            undefined,

          score:
            undefined,

          confianza:
            undefined,

          motivo:
            undefined,

          fuente:
            undefined,
        }
      }),
  }
}
