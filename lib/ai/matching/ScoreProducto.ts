import { normalizarTexto } from "./NormalizarTexto";

export type ResultadoScore = {
  score: number;
  palabrasCoincidentes: number;
  palabrasTotales: number;
};

export function scoreProducto(
  textoIA: string,
  textoBD: string
): ResultadoScore {

  const a = normalizarTexto(textoIA)
    .split(" ")
    .filter(Boolean);

  const b = normalizarTexto(textoBD)
    .split(" ")
    .filter(Boolean);

  let coincidencias = 0;

  for (const palabra of a) {

    if (b.includes(palabra)) {
      coincidencias++;
    }

  }

  const total = Math.max(a.length, b.length);

  const score =
    total === 0
      ? 0
      : Math.round(
          (coincidencias / total) * 100
        );

  return {

    score,

    palabrasCoincidentes:
      coincidencias,

    palabrasTotales:
      total,

  };

}