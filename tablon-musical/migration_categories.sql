-- Crear la tabla 'categories' si no existe
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    bg_color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security para mayor seguridad
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Política 1: Todo el mundo puede LEER las categorías (para que aparezcan en los filtros)
CREATE POLICY "Permitir lectura publica de categorias" ON public.categories
    FOR SELECT USING (true);

-- Política 2: Solo los usuarios Autenticados (Admin) pueden INSERTAR (crear) nuevas categorías
CREATE POLICY "Permitir creacion solo a admins" ON public.categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política 3: Solo los usuarios Autenticados (Admin) pueden ACTUALIZAR categorías
CREATE POLICY "Permitir edicion solo a admins" ON public.categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política 4: Solo los usuarios Autenticados (Admin) pueden ELIMINAR categorías
CREATE POLICY "Permitir borrado solo a admins" ON public.categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insertar las categorías originales por defecto
INSERT INTO public.categories (name, color, bg_color) VALUES 
('Compra/Venta', 'var(--neon-green)', 'rgba(57, 255, 20, 0.1)'),
('Conciertos', 'var(--neon-blue)', 'rgba(5, 217, 232, 0.1)'),
('Otros', 'var(--neon-pink)', 'rgba(255, 42, 109, 0.1)')
ON CONFLICT (name) DO NOTHING;

-- Si hiciera falta hacer un reset del cache de API de Supabase, esto fuerza el reload de schema
NOTIFY pgrst, 'reload schema';
