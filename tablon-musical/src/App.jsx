import React, { useState, useEffect } from 'react';
import './App.css';
import NoticeCard from './components/NoticeCard';
import Filters from './components/Filters';
import CreateNoticeModal from './components/CreateNoticeModal';
import { Plus } from 'lucide-react';
import { supabase, uploadImage } from './lib/supabase';

function App() {
  const [notices, setNotices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notices from Supabase
  useEffect(() => {
    async function fetchNotices() {
      // Usamos iste query que trae los más nuevos primero
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        // En frontend adicionalmente podemos filtrar los de más de 14 días para "archivarlos" visualmente
        // El cron job se encargará a los 30 de borrarlos, pero a los 14 ya no deberían salir aquí.
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const validNotices = data.filter(n => new Date(n.created_at) > fourteenDaysAgo);
        setNotices(validNotices);
      }
      setIsLoading(false);
    }
    
    fetchNotices();
  }, []);

  // Filter logic
  const filteredNotices = notices.filter(n => activeFilter === 'Todos' || n.tag === activeFilter);

  // Handle new notice
  const handleCreateNotice = async (formData, files = []) => {
    
    // Subir imágenes primero
    let imagesUrls = [];
    if (files && files.length > 0) {
      setIsLoading(true); // Opcional para dar feedback visual desde App
      try {
        // Ejecutamos las subidas en paralelo
        const uploadPromises = files.map(file => uploadImage(file));
        imagesUrls = await Promise.all(uploadPromises);
      } catch (err) {
        setIsLoading(false);
        console.error("Error al subir imagenes", err);
        throw err;
      }
      setIsLoading(false);
    }
    
    // image_url se mantiene null para compatibilidad antigua temporal o se obvia,
    // Insertamos el nuevo array en el campo `images` JSONB
    const { data, error } = await supabase
      .from('notices')
      .insert([
        { ...formData, image_url: imagesUrls[0] || null, images: imagesUrls }
      ])
      .select();
      
    if (error) {
      console.error('Error insertando en la DB', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      // Añadir al principio del estado
      setNotices([data[0], ...notices]);
      // Devolver los datos para que el Modal lea el edit_token
      return data[0];
    }
  };

  return (
    <div className="app-container">
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)' }}>
          SVQ_MUSIC_PROJECTS
        </h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Publicar
        </button>
      </header>

      <main className="main-content">
        <section style={{ textAlign: 'center', margin: '3rem 0', animation: 'fadeIn 0.8s ease' }}>
          <h2 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-primary)', textShadow: '4px 4px 0 var(--accent-color)' }}>
            ESCENA MUSICAL SEVILLA
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', letterSpacing: '0.05em' }}>
            TABLÓN DE ANUNCIOS POR Y PARA ARTISTAS DE LA ESCENA SEVILLANA
          </p>
        </section>

        <Filters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              CARGANDO LA ESCENA...
            </div>
          ) : (
            <>
              {filteredNotices.map(notice => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
              {filteredNotices.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  LA ESCENA ESTÁ MUERTA EN ESTA CATEGORÍA. SÉ EL PRIMERO.
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <CreateNoticeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateNotice} 
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
