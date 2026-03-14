import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Función auxiliar para subir fotos al Storage
 */
export async function uploadImage(file) {
  if (!file) return null;
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
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
