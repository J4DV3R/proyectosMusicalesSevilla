-- ==============================================================================
-- 🔒 SCRIPT DE SEGURIDAD MÁXIMA PARA SVQ_MUSIC_BOARD (ENDURECIMIENTO RLS)
-- ==============================================================================
-- Este script reemplaza las políticas "abiertas" temporales por reglas estrictas.

-- 1. Asegurarnos de que RLS sigue activado
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas antiguas inseguras (si existen)
DROP POLICY IF EXISTS "Public notices are viewable by everyone." ON public.notices;
DROP POLICY IF EXISTS "Anyone can insert notes" ON public.notices;
DROP POLICY IF EXISTS "Anyone can update notices manually" ON public.notices;
DROP POLICY IF EXISTS "Anyone can delete notices manually" ON public.notices;

-- ==============================================================================
-- 🛡️ NUEVAS REGLAS DE SEGURIDAD ESTRICTA (POLICIES)
-- ==============================================================================

-- REGLA 1 (LECTURA): Todo el mundo puede seguir viendo el tablón.
CREATE POLICY "Public read access" 
ON public.notices FOR SELECT 
USING (true);

-- REGLA 2 (CREACIÓN): Todo el mundo puede crear un anuncio.
CREATE POLICY "Public insert access" 
ON public.notices FOR INSERT 
WITH CHECK (true);

-- REGLA 3 (EJECUCIÓN/ACTUALIZACIÓN): 
-- Solo puedes modificar un anuncio SI (y solo si):
-- a) Eres el ADMINISTRADOR (has iniciado sesión con Supabase Auth).
-- b) Estás mandando tu 'edit_token' secreto en la misma petición y coincide con la base de datos.
CREATE POLICY "Strict update access (Admin or Token holders only)" 
ON public.notices FOR UPDATE 
USING (
  -- ¿Es Administrador autenticado?
  auth.uid() IS NOT NULL 
  OR 
  -- ¿O el token proporcionado en el UPDATE es igual al edit_token real de la fila?
  -- (Nota: Esta regla protege que alguien intente cambiar datos sin el token).
  -- Dado que estamos desde el frontend, pasaremos esto mandando siempre el token en el body de actualización.
  -- Por ahora nos basta con el chequeo a nivel DB.
  true
);

-- NOTA TÉCNICA: En Supabase, para hacer el checking exacto del token del old_row (datos antes de update) 
-- y new_row, redefinimos la regla UPDATE con mayor precisión:
DROP POLICY IF EXISTS "Strict update access (Admin or Token holders only)" ON public.notices;

CREATE POLICY "Strict update access (Admin or Token holders only)" 
ON public.notices FOR UPDATE 
USING (
  auth.uid() IS NOT NULL OR edit_token::text = current_setting('request.jwt.claims', true)::json->>'edit_token'
);
-- *Dado que enviar custom headers desde supabase-js para validar RLS del token es complejo, implementaremos la seguridad más inteligente basada en roles Admin vs Público.*

-- REESCRIBAMOS LA REGLA 3 y 4 DEFINITIVAMENTE CON ESTE ENFOQUE PRÁCTICO:
DROP POLICY "Strict update access (Admin or Token holders only)" ON public.notices;

-- ==============================================================================
-- 🔐 REGLAS 3 y 4: SEGURIDAD REALISTA PARA REACT (TOKENS Y ADMIN)
-- ==============================================================================
-- Para que el 'edit_token' actúe como una llave en tu frontend React sin crear complejidad de cookies de JWT, 
-- haremos que Supabase solo permita actualizaciones a administradores, y crearemos una FUNCIÓN SEGURA RPC 
-- que se salte el RLS, pero *solo* si el token pasado por el usuario coincide con la BBDD.

-- Para mantener este proyecto simple pero seguro: Vamos a dejar `auth.uid() IS NOT NULL` (Solo el admin puede tocar libremente todo).
CREATE POLICY "Admin full update" 
ON public.notices FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin full delete" 
ON public.notices FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- ==============================================================================
-- ⚡ FUNCIONES BIFASS (RPC) PARA LOS CREADORES LOCALES DEL FRONTEND
-- ==============================================================================
-- Estas dos funciones permiten que el frontend actualice o borre, pero internamente la base de datos 
-- hace una comprobación estricta de que el token es idéntico antes de hacer nada. (SECURITY DEFINER = Ignora RLS localmente)

CREATE OR REPLACE FUNCTION update_notice_with_token(p_token TEXT, p_title TEXT, p_description TEXT, p_tag TEXT, p_location TEXT, p_price TEXT, p_contact_type TEXT, p_contact_value TEXT, p_image_url TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notices
  SET title = p_title, description = p_description, tag = p_tag, location = p_location, price = p_price, contact_type = p_contact_type, contact_value = p_contact_value, image_url = p_image_url
  WHERE edit_token = p_token::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION delete_notice_with_token(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notices WHERE edit_token = p_token::uuid;
END;
$$;

-- IMPORTANTÍSIMO: Forzamos a la API a que lea las nuevas funciones para que no devuelva "No se encuentra"
NOTIFY pgrst, 'reload schema';
