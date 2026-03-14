import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymycujvlcbbixxqygnam.supabase.co';
const supabaseKey = 'sb_publishable_ZizUclxGPEeVG-5jnKRrQQ_f0LYelZB';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Intentando insertar...");
  const { data, error } = await supabase
    .from('notices')
    .insert([
      { 
        title: 'Test Image', 
        description: 'Testing', 
        tag: 'Otros',
        contact_type: 'email',
        contact_value: 'test@test.com',
        image_url: 'http://test.com/img.jpg',
        images: ['http://test.com/img.jpg']
      }
    ])
    .select();

  if (error) {
    console.error("Error exacto:", JSON.stringify(error, null, 2));
  } else {
    console.log("Inserción exitosa:", data);
  }
}

testInsert();
