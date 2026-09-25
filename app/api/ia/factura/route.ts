import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  extraerComprobante,
  procesarConOpenAIAutorizado,
} from "@/lib/ai/extraer-comprobante"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 15 * 1024 * 1024

function archivoABase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const proveedor = formData.get("provider")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 }
      )
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser una imagen o un PDF." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo supera el límite de 15 MB." },
        { status: 413 }
      )
    }

    const base64 = archivoABase64(await file.arrayBuffer())

    if (proveedor === "openai") {
      const logId = formData.get("logId")
      const datos = await procesarConOpenAIAutorizado(
        base64,
        file.type,
        "factura",
        typeof logId === "string" && logId ? logId : null
      )

      return NextResponse.json(datos)
    }

    try {
      const datos = await extraerComprobante(base64, file.type, "factura")
      return NextResponse.json(datos)
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "Gemini no pudo procesar el documento."
      const logId =
        error && typeof error === "object" && "logId" in error
          ? String((error as { logId?: string | null }).logId ?? "")
          : ""

      return NextResponse.json(
        {
          code: "GEMINI_FALLBACK_REQUIRED",
          logId: logId || null,
          message: mensaje,
        },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error("Error procesando factura con IA:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar la factura." },
      { status: 500 }
    )
  }
}
