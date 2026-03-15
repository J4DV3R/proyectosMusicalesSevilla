import React, { useState, useEffect } from 'react';
import './App.css';
import NoticeCard from './components/NoticeCard';
import Filters from './components/Filters';
import CreateNoticeModal from './components/CreateNoticeModal';
import { Plus, Search, Sun, Moon, Bookmark, Trash2 } from 'lucide-react';
import { supabase, uploadImage } from './lib/supabase';

function App() {
  const [notices, setNotices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // oscuro por defecto
  });

  // Aplicar tema al document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Mis anuncios guardados en localStorage
  const [myNotices, setMyNotices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('myNotices') || '[]'); } catch { return []; }
  });
  const [showMyNotices, setShowMyNotices] = useState(false);

  const saveTokenLocally = (title, editToken) => {
    const updated = [{ title, token: editToken, date: new Date().toLocaleDateString() }, ...myNotices];
    setMyNotices(updated);
    localStorage.setItem('myNotices', JSON.stringify(updated));
  };

  const removeLocalToken = (token) => {
    const updated = myNotices.filter(n => n.token !== token);
    setMyNotices(updated);
    localStorage.setItem('myNotices', JSON.stringify(updated));
  };

  // Fetch notices from Supabase
  useEffect(() => {
    async function fetchNotices() {
      // Usamos iste query que trae los más nuevos primero
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, description, tag, location, price, contact_type, contact_value, image_url, images, created_at')
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

  // Filter logic: Categoría + Texto (case-insensitive)
  const filteredNotices = notices.filter(n => {
    // 1. Coincidencia de Categoría
    const matchesCategory = activeFilter === 'Todos' || n.tag === activeFilter;
    
    // 2. Coincidencia de Texto (Buscador)
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (n.title && n.title.toLowerCase().includes(lowerQuery)) || 
      (n.description && n.description.toLowerCase().includes(lowerQuery));
      
    return matchesCategory && matchesSearch;
  });

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
      // Propagar el mensaje exacto si es nuestra excepción personalizada
      if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw error;
    }
    
    if (data && data.length > 0) {
      setNotices([data[0], ...notices]);
      // Guardar token en localStorage para recuperacion futura
      if (data[0].edit_token) {
        saveTokenLocally(formData.title, data[0].edit_token);
      }
      return data[0];
    }
  };

  return (
    <div className="app-container">
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)' }}>
          SVQ_PROYECTOS_MUSICALES
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={() => setShowMyNotices(!showMyNotices)} title="Mis Anuncios Guardados" style={{ position: 'relative', borderColor: myNotices.length > 0 ? 'var(--neon-green)' : 'var(--border-color)', color: myNotices.length > 0 ? 'var(--neon-green)' : 'var(--text-secondary)' }}>
            <Bookmark size={18} />
            {myNotices.length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--neon-pink)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{myNotices.length}</span>
            )}
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Publicar
          </button>
        </div>
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

        {/* Buscador de Texto */}
        <section style={{ maxWidth: '600px', margin: '0 auto 2rem auto', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por palabra clave, grupo, instrumento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base"
            style={{ 
              paddingLeft: '48px', 
              borderRadius: '24px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              border: searchQuery ? '1px solid var(--neon-green)' : '1px solid var(--border-color)',
              transition: 'border-color 0.3s ease'
            }}
          />
        </section>

        <Filters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

        {/* Panel de Mis Anuncios */}
        {showMyNotices && (
          <section className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', padding: '1.5rem', borderRadius: 'var(--border-radius-md)', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--neon-green)' }}>MIS ANUNCIOS (este dispositivo)</h3>
              <button onClick={() => setShowMyNotices(false)} style={{ color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem' }}>&#10006;</button>
            </div>
            {myNotices.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No has publicado nada desde este dispositivo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myNotices.map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <a href={`/edit/${n.token}`} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }}>Editar</a>
                      <button onClick={() => removeLocalToken(n.token)} style={{ color: 'var(--text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }} title="Olvidar enlace">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Estos enlaces se guardan SOLO en este navegador. Si borras los datos del navegador, se perderan.
            </p>
          </section>
        )}

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

      {/* Botón flotante de tema */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 999,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--surface-color)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        {darkMode ? <Sun size={22} /> : <Moon size={22} />}
      </button>
    </div>
  );
}

export default App;
