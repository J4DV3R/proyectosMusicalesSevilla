import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ymycujvlcbbixxqygnam.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZizUclxGPEeVG-5jnKRrQQ_f0LYelZB';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log("Intentando crear usuario administrador con un correo estándar...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@example.com',
    password: 'svq_underground_admin!',
  });

  if (error) {
    console.error("Error creando admin:", error.message);
  } else {
    console.log("Exitoso");
    console.log("Usuario de acceso creado: admin@example.com");
    console.log("Contraseña maestra: svq_underground_admin!");
  }
}

createAdmin();
