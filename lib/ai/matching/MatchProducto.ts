import { scoreProducto } from "./ScoreProducto";

export type ProductoMatch = {
  id: string;
  nombre: string;
};

export type ResultadoMatch = {
  producto: ProductoMatch | null;
  score: number;
  razon: string;
};

export function matchProducto(
  textoIA: string,
  productos: ProductoMatch[]
): ResultadoMatch {

  let mejor: ProductoMatch | null = null;
  let mejorScore = 0;

  for (const producto of productos) {

    const resultado = scoreProducto(
      textoIA,
      producto.nombre
    );

    if (resultado.score > mejorScore) {

      mejor = producto;
      mejorScore = resultado.score;

    }

  }

  if (!mejor) {

    return {
      producto: null,
      score: 0,
      razon: "No se encontraron coincidencias.",
    };

  }

  let razon = "";

  if (mejorScore >= 95) {

    razon = "Coincidencia prácticamente exacta.";

  } else if (mejorScore >= 80) {

    razon = "Coincidencia muy alta.";

  } else if (mejorScore >= 60) {

    razon = "Coincidencia parcial.";

  } else {

    razon = "Coincidencia baja.";

  }

  return {

    producto: mejor,

    score: mejorScore,

    razon,

  };

}