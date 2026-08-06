import { parseProducto } from "./parseProducto";
import { scoreProducto } from "./ScoreProducto";

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
  let mejorScore = -1;
  let motivo = "";

  for (const producto of productos) {

    const productoBD = parseProducto(
      producto.nombre
    );

    let score = 0;

    // Marca (40 puntos)

    if (
      productoIA.marca &&
      productoBD.marca &&
      productoIA.marca === productoBD.marca
    ) {
      score += 40;
    }

    // Volumen (25 puntos)

    if (
      productoIA.volumen &&
      productoBD.volumen &&
      productoIA.volumen === productoBD.volumen
    ) {
      score += 25;
    }

    // Unidad (10 puntos)

    if (
      productoIA.unidad &&
      productoBD.unidad &&
      productoIA.unidad === productoBD.unidad
    ) {
      score += 10;
    }

    // Envase (10 puntos)

    if (
      productoIA.envase &&
      productoBD.envase &&
      productoIA.envase === productoBD.envase
    ) {
      score += 10;
    }

    // Pack (5 puntos)

    if (
      productoIA.pack &&
      productoBD.pack &&
      productoIA.pack === productoBD.pack
    ) {
      score += 5;
    }

    // Texto (20 puntos)

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

  let confianza: SmartMatch["confianza"];

  if (mejorScore >= 90) {

    confianza = "alta";
    motivo =
      "Coincidencia por marca, presentación y descripción.";

  } else if (mejorScore >= 70) {

    confianza = "media";
    motivo =
      "Coincidencia parcial. Conviene revisar.";

  } else {

    confianza = "baja";
    motivo =
      "No se encontró una coincidencia confiable.";

  }

  return {

    producto: mejorProducto,

    score: Math.round(mejorScore),

    confianza,

    motivo,

  };

}