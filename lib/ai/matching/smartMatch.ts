import { parseProducto } from "./parseProducto";
import { scoreProducto } from "./scoreProducto";

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

export function smartMatch(
  descripcionIA: string,
  productos: ProductoBD[]
): SmartMatch {

  const productoIA = parseProducto(descripcionIA);

  let mejorProducto: ProductoBD | null = null;
  let mejorScore = 0;

  for (const producto of productos) {

    const productoBD = parseProducto(producto.nombre);

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
      productoIA.volumen &&
      productoBD.volumen &&
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

    motivo =
      "Coincidencia alta por marca, presentación y descripción.";

  } else if (scoreFinal >= 70) {

    confianza = "media";

    motivo =
      "Coincidencia parcial. Conviene revisar el producto.";

  } else {

    confianza = "baja";

    motivo =
      "No se encontró una coincidencia confiable.";

    // No asignamos automáticamente un producto
    mejorProducto = null;
  }

  return {
    producto: mejorProducto,
    score: scoreFinal,
    confianza,
    motivo,
  };
}