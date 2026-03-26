import React, { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';
import NoticeCard from './components/NoticeCard';
import Filters from './components/Filters';
import HomePage from './components/HomePage';
import ReportsPage from './components/ReportsPage';

const CreateNoticeModal = lazy(() => import('./components/CreateNoticeModal'));
import { Plus, Search, Sun, Moon, Bookmark, Trash2, EyeOff } from 'lucide-react';
import { supabase, uploadImage } from './lib/supabase';
import { useTheme } from './context/ThemeContext';

function App() {
  const [notices, setNotices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { darkMode, setDarkMode } = useTheme();

  // Pestañas
  const [activeTab, setActiveTab] = useState('home');
  const [tabVisibility, setTabVisibility] = useState({ home: true, ads: true, reports: true });
  const [isAdmin, setIsAdmin] = useState(false);

  // Mis anuncios guardados en localStorage
  const [myNotices, setMyNotices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('myNotices') || '[]'); } catch { return []; }
  });
  const [showMyNotices, setShowMyNotices] = useState(false);

  // Comprobar sesión de admin
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cargar visibilidad de pestañas desde Supabase
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'tabs_visibility')
        .single();
      if (data?.value) {
        setTabVisibility(data.value);
        // Ir a la primera pestaña visible por defecto
        if (data.value.home) setActiveTab('home');
        else if (data.value.ads) setActiveTab('ads');
      }
    }
    fetchSettings();
  }, []);

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

  const handleDeleteNotice = async (token) => {
    if (!window.confirm("¿Seguro que quieres borrar este anuncio permanentemente de la plataforma?")) return;
    const { error } = await supabase.rpc('delete_notice_with_token', { p_token: token });
    if (error && error.message && !error.message.includes('ya fue borrado')) {
      console.error(error);
      alert("Error al intentar borrar el anuncio de la base de datos.");
      return;
    }
    alert("Anuncio eliminado definitivamente.");
    removeLocalToken(token);
    const { data } = await supabase
      .from('notices')
      .select('id, title, description, tag, location, price, contact_type, contact_value, contacts, image_url, images, created_at')
      .order('created_at', { ascending: false });
    if (data) {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      setNotices(data.filter(n => new Date(n.created_at) > fourteenDaysAgo));
    }
  };

  // Fetch notices
  useEffect(() => {
    async function fetchNotices() {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, description, tag, location, price, contact_type, contact_value, image_url, images, created_at')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        setNotices(data.filter(n => new Date(n.created_at) > fourteenDaysAgo));
      }
      setIsLoading(false);
    }
    fetchNotices();
  }, []);

  const filteredNotices = notices.filter(n => {
    const matchesCategory = activeFilter === 'Todos' || n.tag === activeFilter;
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
      (n.description && n.description.toLowerCase().includes(lowerQuery));
    return matchesCategory && matchesSearch;
  });

  const handleCreateNotice = async (formData, files = []) => {
    let imagesUrls = [];
    if (files && files.length > 0) {
      setIsLoading(true);
      try {
        const uploadPromises = files.map(file => uploadImage(file));
        imagesUrls = await Promise.all(uploadPromises);
      } catch (err) {
        setIsLoading(false);
        console.error("Error al subir imagenes", err);
        throw err;
      }
      setIsLoading(false);
    }
    const { data, error } = await supabase
      .from('notices')
      .insert([{ ...formData, image_url: imagesUrls[0] || null, images: imagesUrls }])
      .select();
    if (error) {
      console.error('Error insertando en la DB', error);
      if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw error;
    }
    if (data && data.length > 0) {
      setNotices([data[0], ...notices]);
      if (data[0].edit_token) {
        saveTokenLocally(formData.title, data[0].edit_token);
      }
      return data[0];
    }
  };

  // Pestañas disponibles: el admin ve todas, el público solo las activas
  const TABS = [
    { id: 'home',    label: 'Inicio' },
    { id: 'ads',     label: 'Anuncios' },
    { id: 'reports', label: 'Reportar' },
  ];
  const visibleTabs = TABS.filter(t => isAdmin || tabVisibility[t.id]);

  // Si la pestaña activa queda oculta para el público, forzar la primera visible
  useEffect(() => {
    if (!isAdmin && !tabVisibility[activeTab]) {
      const first = TABS.find(t => tabVisibility[t.id]);
      if (first) setActiveTab(first.id);
    }
  }, [tabVisibility, isAdmin, activeTab]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)' }}>
          SVQ_PROYECTOS_MUSICALES
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Publicar
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      {visibleTabs.length > 1 && (
        <nav style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', padding: '0 2rem', backgroundColor: 'var(--surface-color)', gap: '4px' }}>
          {visibleTabs.map(tab => {
            const isHidden = !tabVisibility[tab.id]; // pestaña desactivada (solo admin la ve)
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 400,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
                {isHidden && isAdmin && (
                  <EyeOff size={13} color="var(--neon-pink)" title="Oculta al público" />
                )}
              </button>
            );
          })}
        </nav>
      )}

      <main className="main-content">
        {/* ── PESTAÑA INICIO ── */}
        {activeTab === 'home' && <HomePage onGoToAds={() => setActiveTab('ads')} />}

        {/* ── PESTAÑA REPORTAR ── */}
        {activeTab === 'reports' && <ReportsPage />}

        {/* ── PESTAÑA ANUNCIOS ── */}
        {activeTab === 'ads' && (
          <>
            <section style={{ textAlign: 'center', margin: '3rem 0', animation: 'fadeIn 0.8s ease' }}>
              <h2 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-primary)', textShadow: '4px 4px 0 var(--accent-color)' }}>
                ESCENA MUSICAL SEVILLA
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', letterSpacing: '0.05em' }}>
                TABLÓN DE ANUNCIOS POR Y PARA ARTISTAS DE LA ESCENA SEVILLANA
              </p>
            </section>

            {/* Buscador + Mis Anuncios */}
            <section style={{ maxWidth: '600px', margin: '0 auto 2rem auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
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
                    transition: 'border-color 0.3s ease',
                    width: '100%'
                  }}
                />
              </div>
              <button 
                className="btn" 
                onClick={() => setShowMyNotices(!showMyNotices)} 
                title="Mis Anuncios Guardados" 
                style={{ 
                  position: 'relative', 
                  height: '48px', 
                  width: '48px', 
                  minWidth: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  borderColor: myNotices.length > 0 ? 'var(--neon-green)' : 'var(--border-color)', 
                  color: myNotices.length > 0 ? 'var(--neon-green)' : 'var(--text-secondary)',
                  padding: 0
                }}
              >
                <Bookmark size={20} />
                {myNotices.length > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'var(--neon-pink)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{myNotices.length}</span>
                )}
              </button>
            </section>

            <Filters activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

            {/* Panel Mis Anuncios */}
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
                          <a href={`/edit/${n.token}`} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }} title="Editar o ver detalles">Editar</a>
                          <button onClick={() => handleDeleteNotice(n.token)} style={{ color: 'var(--neon-pink)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }} title="Borrar anuncio de la plataforma">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Estos enlaces se guardan SOLO en este navegador. Si borras los datos del navegador, se perderán.
                </p>
              </section>
            )}

            {/* Grid de anuncios */}
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
          </>
        )}
      </main>

      {isModalOpen && (
        <Suspense fallback={
          <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <span style={{ color: 'var(--neon-blue)', fontFamily: 'monospace' }}>CARGANDO MODÚLO...</span>
          </div>
        }>
          <CreateNoticeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateNotice}
          />
        </Suspense>
      )}

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
          position: 'fixed', bottom: '24px', left: '24px', zIndex: 999,
          width: '48px', height: '48px', borderRadius: '50%',
          border: '1px solid var(--border-color)', background: 'var(--surface-color)',
          color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'all 0.3s ease'
        }}
      >
        {darkMode ? <Sun size={22} /> : <Moon size={22} />}
      </button>
    </div>
  );
}

export default App;
