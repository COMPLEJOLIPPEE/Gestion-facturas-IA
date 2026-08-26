const reemplazos: Record<string, string> = {
  "cocacola": "coca cola",
  "coca-cola": "coca cola",

  "pepsi cola": "pepsi",
  "sprite zero": "sprite",
  "fanta naranja": "fanta",

  "pet": "botella",
  "bot": "botella",

  "lta": "lata",

  "cm3": "ml",
  "cc": "ml",

  "kgs": "kg",
  "kilo": "kg",
  "kilos": "kg",

  "gr": "g",

  "uni": "",
  "unidad": "",
  "unidades": "",
}

export function normalizarTexto(texto: string): string {
  let resultado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  resultado = resultado
    .replace(/[-_/,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  for (const [buscar, reemplazo] of Object.entries(reemplazos)) {
    resultado = resultado.replace(
      new RegExp(`\\b${buscar}\\b`, "g"),
      reemplazo
    )
  }

  return resultado
    .replace(/\s+/g, " ")
    .trim()
}