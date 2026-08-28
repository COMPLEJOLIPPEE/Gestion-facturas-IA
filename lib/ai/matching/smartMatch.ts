import { parseProducto } from "./parseProducto";
import { scoreProducto } from "./scoreProducto";
import { normalizarTexto } from "./normalizarTexto";

export type ProductoBD = {
  id: string;
  nombre: string;
};

export type SmartMatch = {
  producto: ProductoBD | null;
  score: number;
  confianza: "alta" | "media" | "baja";
  motivo: string;
};

function claveExacta(texto: string): string {
  // Permite reconocer como iguales variantes puramente de formato:
  // "POW M.BLAST 1.5Lx4" vs "POW M.BLAST 1.5L X4", por ejemplo.
  return normalizarTexto(texto).replace(/[^a-z0-9]/g, "");
}

export function smartMatch(
  descripcionIA: string,
  productos: ProductoBD[]
): SmartMatch {
  const productoIA = parseProducto(descripcionIA);
  const claveIA = claveExacta(descripcionIA);

  let mejorProducto: ProductoBD | null = null;
  let mejorScore = 0;

  for (const producto of productos) {
    const productoBD = parseProducto(producto.nombre);

    // Coincidencia exacta del nombre normalizado: prioridad absoluta.
    // No debe depender de que el parser haya identificado correctamente
    // marca, volumen, envase o pack.
    if (claveIA && claveIA === claveExacta(producto.nombre)) {
      return {
        producto,
        score: 100,
        confianza: "alta",
        motivo: "Coincidencia exacta del nombre del producto normalizado.",
      };
    }

    let score = 0;

    // Marca: 30 puntos
    if (
      productoIA.marca &&
      productoBD.marca &&
      productoIA.marca === productoBD.marca
    ) {
      score += 30;
    }

    // Volumen: 25 puntos
    if (
      productoIA.volumen != null &&
      productoBD.volumen != null &&
      productoIA.volumen === productoBD.volumen
    ) {
      score += 25;
    }

    // Unidad: 10 puntos
    if (
      productoIA.unidad &&
      productoBD.unidad &&
      productoIA.unidad === productoBD.unidad
    ) {
      score += 10;
    }

    // Envase: 10 puntos
    if (
      productoIA.envase &&
      productoBD.envase &&
      productoIA.envase === productoBD.envase
    ) {
      score += 10;
    }

    // Pack: 5 puntos
    if (
      productoIA.pack &&
      productoBD.pack &&
      productoIA.pack === productoBD.pack
    ) {
      score += 5;
    }

    // Descripción: 20 puntos
    const similitud = scoreProducto(
      descripcionIA,
      producto.nombre
    );

    score += similitud.score * 0.2;

    if (score > mejorScore) {
      mejorScore = score;
      mejorProducto = producto;
    }
  }

  const scoreFinal = Math.round(mejorScore);

  let confianza: SmartMatch["confianza"];
  let motivo: string;

  if (scoreFinal >= 90) {
    confianza = "alta";
    motivo = "Coincidencia alta por marca, presentación y descripción.";
  } else if (scoreFinal >= 70) {
    confianza = "media";
    motivo = "Coincidencia parcial. Conviene revisar el producto.";
  } else {
    confianza = "baja";
    motivo = "No se encontró una coincidencia confiable.";
    mejorProducto = null;
  }

  return {
    producto: mejorProducto,
    score: scoreFinal,
    confianza,
    motivo,
  };
}
