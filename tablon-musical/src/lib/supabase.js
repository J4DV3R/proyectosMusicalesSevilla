import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Tipos MIME permitidos y tamaño máximo para subidas
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Función auxiliar para subir fotos al Storage (con validación de seguridad)
 */
export async function uploadImage(file) {
  if (!file) return null;

  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo se aceptan imágenes (JPG, PNG, WebP, GIF).`);
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 5MB.`);
  }

  // Validar extensión
  const fileExt = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    throw new Error(`Extensión .${fileExt} no permitida. Usa: ${ALLOWED_EXTENSIONS.join(', ')}.`);
  }

  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${fileName}`;
  
  const { error: uploadError } = await supabase.storage
    .from('notices_images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  // Get public URL
  const { data } = supabase.storage
    .from('notices_images')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}

/**
 * Sube una foto de perfil (avatar) al bucket 'avatars'
 */
export async function uploadAvatar(file) {
  if (!file) return null;

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Tipo no permitido: ${file.type}. Solo JPG, PNG, WebP o GIF.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.`);
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    throw new Error(`Extensión .${fileExt} no permitida. Usa: ${ALLOWED_EXTENSIONS.join(', ')}.`);
  }

  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Sanitiza texto para prevenir inyección de código (XSS)
 * Elimina etiquetas HTML y caracteres peligrosos
 */
export function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/\\/g, '&#x5C;')
    .trim();
}

/**
 * Valida la contraseña según las reglas de seguridad:
 * - Entre 7 y 15 caracteres
 * - Al menos 1 carácter especial
 * - Sin secuencias de inyección de código
 */
export function validatePassword(password) {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < 7) return 'La contraseña debe tener al menos 7 caracteres.';
  if (password.length > 15) return 'La contraseña no puede superar los 15 caracteres.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    return 'La contraseña debe incluir al menos un carácter especial (!@#$%...).';
  // Bloquear patrones de inyección SQL/código
  const dangerous = /('|--|;|\/\*|\*\/|xp_|UNION|SELECT|INSERT|DROP|DELETE|UPDATE|EXEC|SCRIPT)/i;
  if (dangerous.test(password)) return 'La contraseña contiene caracteres no permitidos.';
  return null; // null = válida
}

