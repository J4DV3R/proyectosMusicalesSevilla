// src/lib/badWords.js

// Lista básica de palabras malsonantes en español (adaptable)
// Usamos minúsculas para comparaciones insensibles a mayúsculas/minúsculas.
export const spanishBadWords = [
  'puta', 'puto', 'putas', 'putos',
  'mierda', 'mierdas',
  'coño', 'coño', 'coños',
  'joder', 'jodido', 'jodida', 'jodidos', 'jodidas', 'jodete',
  'cabron', 'cabrón', 'cabrones', 'cabrona', 'cabronazo',
  'gilipollas', 'gilipolla',
  'capullo', 'capullos',
  'subnormal', 'subnormales',
  'maricon', 'maricón', 'maricones',
  'follar', 'follamos', 'follando', 'follada', 'follado',
  'polla', 'pollas',
  'cojones', 'cojon', 'cojón',
  'hostia', 'hostias', 'osti', 'ostias', // Nota: hostia puede ser contexto, pero suele ser obsceno/insulto
  'zorra', 'zorras',
  'ramera', 'rameras',
  'pendejo', 'pendeja', 'pendejos', 'pendejas',
  'tonto', 'tonta', 'tontos', 'tontas', // * Puede ser suave, si prefieres no bloquearlo, quítalo
  'idiota', 'idiotas',
  'imbecil', 'imbécil', 'imbeciles', 'imbéciles',
  'estupido', 'estupida', 'estúpido', 'estúpida',
  'malparido', 'malparida', 'hijo de puta', 'hijodeputa', 'hp', 'hdp'
];

/**
 * Función que comprueba si un texto contiene palabras malsonantes.
 * @param {string} text - El texto a analizar.
 * @returns {boolean} - True si contiene palabras malsonantes, False si está limpio.
 */
export const containsBadWords = (text) => {
  if (!text) return false;
  
  // Convertimos a minúsculas y limpiamos de signos de puntuación básicos para buscar la palabra limpia
  const lowerText = text.toLowerCase();
  
  // Dividimos en palabras (regex para separar por espacios o puntuación)
  const words = lowerText.match(/\b(\w+)\b/g);
  
  if (!words) return false;

  // Comprobamos si alguna palabra del texto está en nuestra lista negra
  for (let word of words) {
    if (spanishBadWords.includes(word)) {
      return true;
    }
  }

  // Comprobación secundaria para frases compuestas (ej. "hijo de puta")
  for (let badWord of spanishBadWords) {
    if (badWord.includes(' ') && lowerText.includes(badWord)) {
      return true;
    }
  }

  return false;
};
