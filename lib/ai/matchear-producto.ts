function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function similitud(a: string, b: string): number {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const tokensA = new Set(na.split(" "))
  const tokensB = new Set(nb.split(" "))
  const interseccion = [...tokensA].filter((t) => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size

  const jaccard = union > 0 ? interseccion / union : 0
  const incluido = na.includes(nb) || nb.includes(na) ? 0.3 : 0

  return Math.min(jaccard + incluido, 1)
}

export function matchearProducto<T extends { id: string; nombre: string }>(
  descripcion: string,
  productos: T[],
  umbral = 0.45
): T | null {
  let mejor: T | null = null
  let mejorScore = 0

  for (const producto of productos) {
    const score = similitud(descripcion, producto.nombre)
    if (score > mejorScore) {
      mejorScore = score
      mejor = producto
    }
  }

  return mejorScore >= umbral ? mejor : null
}
