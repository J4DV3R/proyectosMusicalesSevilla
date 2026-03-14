-- 1. Crear la tabla de anuncios (notices)
CREATE TABLE public.notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tag TEXT NOT NULL,
    location TEXT,
    price TEXT,
    contact_type TEXT NOT NULL,
    contact_value TEXT NOT NULL,
    image_url TEXT,
    edit_token UUID DEFAULT gen_random_uuid(), -- Token secreto para editar sin login
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Configurar la seguridad de la tabla (Row Level Security - RLS)
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Política 1: Cualquiera puede leer todos los anuncios
CREATE POLICY "Public notices are viewable by everyone." 
ON public.notices FOR SELECT USING (true);

-- Política 2: Cualquiera puede insertar nuevos anuncios
CREATE POLICY "Anyone can insert notes" 
ON public.notices FOR INSERT WITH CHECK (true);

-- Política 3: Actualizar anuncios
CREATE POLICY "Anyone can update notices manually" 
ON public.notices FOR UPDATE USING (true);

-- Política 4: Borrar anuncios
CREATE POLICY "Anyone can delete notices manually" 
ON public.notices FOR DELETE USING (true);


-- 3. Configurar el Almacenamiento (Storage Bucket) de Imágenes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notices_images', 'notices_images', true) ON CONFLICT DO NOTHING;

-- Políticas para permitir subida pública a Storage
CREATE POLICY "Allow public uploads for notices_images" 
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'notices_images');

CREATE POLICY "Allow public reads for notices_images" 
ON storage.objects FOR SELECT TO public USING (bucket_id = 'notices_images');


-- 4. Programar el Autoe-Borrado Definitivo (Cron Job para anuncios > 30 días)
-- (Esta extensión limpiará la BBDD automáticamente todos los días a medianoche)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-30-days-old-notices', 
  '0 0 * * *', 
  $$ DELETE FROM public.notices WHERE created_at < NOW() - INTERVAL '30 days' $$
);
