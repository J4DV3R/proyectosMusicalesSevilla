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
