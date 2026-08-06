import { normalizarTexto } from "./NormalizarTexto";

export type ProductoParseado = {
  textoOriginal: string;

  marca?: string;

  volumen?: number;

  unidad?: string;

  envase?: string;

  pack?: number;

  palabras: string[];
};

const marcas = [
  "coca cola",
  "pepsi",
  "sprite",
  "fanta",
  "quilmes",
  "andes",
  "heineken",
  "manaos",
  "natura",
  "hellmanns",
];

const envases = [
  "lata",
  "botella",
  "vidrio",
  "tetra",
  "bidon",
  "bolsa",
  "pack",
];

export function parseProducto(
  texto: string
): ProductoParseado {

  const limpio = normalizarTexto(texto);

  const palabras = limpio
    .split(" ")
    .filter(Boolean);

  const resultado: ProductoParseado = {
    textoOriginal: texto,
    palabras,
  };

  // Marca

  resultado.marca = marcas.find((marca) =>
    limpio.includes(marca)
  );

  // Envase

  resultado.envase = envases.find((envase) =>
    limpio.includes(envase)
  );

  // Volumen

  const volumen = limpio.match(
    /\b(\d{2,4})\b/
  );

  if (volumen) {

    resultado.volumen =
      Number(volumen[1]);

  }

  // Unidad

  if (texto.toLowerCase().includes("kg")) {

    resultado.unidad = "kg";

  } else if (
    texto.toLowerCase().includes("gr") ||
    texto.toLowerCase().includes("g")
  ) {

    resultado.unidad = "gr";

  } else if (
    texto.toLowerCase().includes("ml")
  ) {

    resultado.unidad = "ml";

  } else if (
    texto.toLowerCase().includes("lt") ||
    texto.toLowerCase().includes("l ")
  ) {

    resultado.unidad = "lt";

  }

  // Pack

  const pack = limpio.match(
    /x\s?(\d{1,2})/
  );

  if (pack) {

    resultado.pack =
      Number(pack[1]);

  }

  return resultado;

}