import type { ComprobanteExtraido, TipoComprobanteIA } from "../tipos"

const OCRSPACE_API_KEY = process.env.OCRSPACE_API_KEY || "helloworld"

function parseFactura(texto: string): Partial<ComprobanteExtraido> {
  // Número de factura: busca algo como "Factura N° 0001-00001234"
  const numeroMatch = texto.match(/(Factura\s*(Nº|No|Número)?\s*[:\-]?\s*\d{4}[- ]?\d+)/i)

  // Fecha: busca formato dd/mm/yyyy o yyyy-mm-dd
  const fechaMatch = texto.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/)

  // Total: busca "Total: 1234,56" o "$ 1234.56"
  const totalMatch = texto.match(/Total\s*[:\-]?\s*\$?\s*([\d.,]+)/i)

  return {
    numero: numeroMatch ? numeroMatch[1] : null,
    fecha: fechaMatch ? fechaMatch[1].replace(/\/|-/g, "-") : null,
    total: totalMatch ? parseFloat(totalMatch[1].replace(",", ".")) : null,
  }
}

export async function extraerConOCRSpace(
  base64: string,
  mimeType: string,
  tipo: TipoComprobanteIA
): Promise<ComprobanteExtraido> {
  const formData = new FormData()
  formData.append("base64Image", `data:${mimeType};base64,${base64}`)
  formData.append("language", "spa")
  formData.append("isOverlayRequired", "false")

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: OCRSPACE_API_KEY },
    body: formData,
  })

  const data = await response.json()

  if (!data || !data.ParsedResults || data.ParsedResults.length === 0) {
    throw new Error("OCR.space no devolvió resultados")
  }

  const textoPlano = data.ParsedResults[0].ParsedText || ""
  const parsed = parseFactura(textoPlano)

  return {
    proveedor_nombre: null, // Podés agregar regex para razón social si querés
    numero: parsed.numero ?? null,
    fecha: parsed.fecha ?? null,
    fecha_vencimiento: null,
    total: parsed.total ?? null,
    lineas: [
      {
        descripcion: textoPlano,
        cantidad: 1,
        precio_unitario: 0,
        iva: null,
      },
    ],
  }
}
