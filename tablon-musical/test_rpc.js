import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ymycujvlcbbixxqygnam.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZizUclxGPEeVG-5jnKRrQQ_f0LYelZB';

// Usamos el ANON key para simular a un usuario sin login publicando/editando
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log("1. Buscando un anuncio reciente para conseguir su Token...");
  const { data: notices, error: err1 } = await supabase.from('notices').select('*').limit(1);
  if (err1 || !notices || notices.length === 0) {
    return console.log("No hay anuncios para probar.");
  }
  
  const notice = notices[0];
  const token = notice.edit_token;
  console.log(`Usando anuncio: ${notice.title} / Token: ${token}`);

  console.log("2. Intentando borrar/actualizar usando el RPC update_notice_with_token...");
  const { error: err2, data } = await supabase.rpc('update_notice_with_token', {
      p_token: token,
      p_title: notice.title + " (Edited)",
      p_description: notice.description,
      p_tag: notice.tag,
      p_location: notice.location || null,
      p_price: notice.price || null,
      p_contact_type: notice.contact_type,
      p_contact_value: notice.contact_value,
      p_image_url: notice.image_url || null
  });

  if (err2) {
    console.error("ERROR DEL RPC:");
    console.error(err2);
  } else {
    console.log("ACTUALIZACIÓN RPC EXITOSA:", data);
  }
}

testRPC();
