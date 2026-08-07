import { normalizarTexto } from "./normalizarTexto"

export function limpiarDescripcion(texto: string) {

  return normalizarTexto(texto)

    .replace(/\b(un|unidad|unidades)\b/g, "")

    .replace(/\b(kg|kgs|kilo|kilos)\b/g, "kg")

    .replace(/\b(lt|lts|litro|litros)\b/g, "l")

    .replace(/\b(cc|ml)\b/g, "ml")

    .replace(/\bx\b/g, " ")

    .replace(/\s+/g, " ")

    .trim()

}