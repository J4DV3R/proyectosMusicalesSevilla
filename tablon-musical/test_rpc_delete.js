import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ymycujvlcbbixxqygnam.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ZizUclxGPEeVG-5jnKRrQQ_f0LYelZB';

// Usamos el ANON key para simular a un usuario sin login
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const token = 'bba8ab29-470f-45b2-9ffa-6fbe4decbc8c';
  
  console.log("Intentando borrar con token:", token);
  const { error, data } = await supabase.rpc('delete_notice_with_token', {
      p_token: token
  });

  if (error) {
    console.error("ERROR DEL RPC DELETE:", error);
  } else {
    console.log("DELETE RPC EXITOSO:", data);
  }
}

testDelete();
