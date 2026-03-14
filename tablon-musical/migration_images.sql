-- ==============================================================================
-- 📀 MIGRACIÓN BBDD: SOPORTE MÚLTIPLES IMÁGENES (MAX 3)
-- ==============================================================================

-- 1. Añadir una columna nueva para soportar el arreglo de imágenes (Formato JSON)
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar la imagen antigua al nuevo array (por si había anuncios creados)
UPDATE public.notices 
SET images = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL AND image_url != '';

-- 3. Actualizar la función RPC para soportar el nuevo campo
DROP FUNCTION IF EXISTS update_notice_with_token(text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION update_notice_with_token(
  p_token TEXT, 
  p_title TEXT, 
  p_description TEXT, 
  p_tag TEXT, 
  p_location TEXT, 
  p_price TEXT, 
  p_contact_type TEXT, 
  p_contact_value TEXT, 
  p_images JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notices
  SET 
    title = p_title, 
    description = p_description, 
    tag = p_tag, 
    location = p_location, 
    price = p_price, 
    contact_type = p_contact_type, 
    contact_value = p_contact_value, 
    images = p_images
  WHERE edit_token = p_token::uuid;
END;
$$;

-- 4. Forzar recarga de API
NOTIFY pgrst, 'reload schema';
