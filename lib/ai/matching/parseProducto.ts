import { normalizarTexto } from "./normalizarTexto";

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

export function parseProducto(texto: string): ProductoParseado {
  const limpio = normalizarTexto(texto);

  const palabras = limpio
    .split(" ")
    .filter(Boolean);

  const resultado: ProductoParseado = {
    textoOriginal: texto,
    palabras,
  };

  // Marca
  resultado.marca = marcas.find((marca) => limpio.includes(marca));

  // Envase
  resultado.envase = envases.find((envase) => limpio.includes(envase));

  // Volumen
  // Acepta tanto enteros como decimales: 354ml, 1.5l, 2 l, etc.
  const volumen = limpio.match(/\b(\d+(?:\.\d+)?)\s*(ml|lt|l|cc|cm3|kg|g|gr)\b/);

  if (volumen) {
    resultado.volumen = Number(volumen[1]);
  }

  // Unidad
  const textoMinusculas = texto.toLowerCase();

  if (/\b\d+(?:[.,]\d+)?\s?kg\b/.test(textoMinusculas)) {
    resultado.unidad = "kg";
  } else if (/\b\d+(?:[.,]\d+)?\s?(?:g|gr)\b/.test(textoMinusculas)) {
    resultado.unidad = "gr";
  } else if (/\b\d+(?:[.,]\d+)?\s?ml\b/.test(textoMinusculas)) {
    resultado.unidad = "ml";
  } else if (/\b\d+(?:[.,]\d+)?\s?(?:lt|l)\b/.test(textoMinusculas)) {
    resultado.unidad = "lt";
  }

  // Pack
  const pack = limpio.match(/x\s?(\d{1,2})/);

  if (pack) {
    resultado.pack = Number(pack[1]);
  }

  return resultado;
}
