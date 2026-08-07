const reemplazos: Record<string, string> = {
  "cocacola": "coca cola",
  "coca-cola": "coca cola",
  "coca cola": "coca cola",

  "pepsi cola": "pepsi",
  "sprite zero": "sprite",
  "fanta naranja": "fanta",

  "lt": "lata",
  "lta": "lata",

  "pet": "botella",
  "bot": "botella",

  "ml": "",
  "cc": "",
  "cm3": "",

  "gr": "",
  "g": "",

  "kg": "kilo",

  "un": "",
  "uni": "",
  "unidad": "",

  "x1": "",
  "x2": "",
  "x3": "",
  "x4": "",
  "x5": "",
  "x6": "",
  "x8": "",
  "x10": "",
  "x12": "",
  "x24": "",

  ".": " ",
  ",": " ",
  "-": " ",
  "_": " ",
  "/": " ",
};

export function normalizartexto(texto: string): string {

  let resultado = texto.toLowerCase();

  resultado = resultado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  Object.entries(reemplazos).forEach(([buscar, reemplazo]) => {

    resultado = resultado.replaceAll(buscar, reemplazo);

  });

  resultado = resultado.replace(/\s+/g, " ");

  resultado = resultado.trim();

  return resultado;

}
export function normalizarTexto(texto: string): string {

  return texto

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[^a-z0-9\s]/g, " ")

    .replace(/\s+/g, " ")

    .trim()

}