import React, { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';
import NoticeCard from './components/NoticeCard';
import Filters from './components/Filters';
import HomePage from './components/HomePage';
import ReportsPage from './components/ReportsPage';

const CreateNoticeModal = lazy(() => import('./components/CreateNoticeModal'));
const AuthModal = lazy(() => import('./components/AuthModal'));
import { Plus, Search, Sun, Moon, Bookmark, Trash2, EyeOff, User, LogIn, LogOut } from 'lucide-react';
import { supabase, uploadImage } from './lib/supabase';
import { useTheme } from './context/ThemeContext';

// Constante fuera del componente para evitar recreación en cada render
const TABS = [
  { id: 'home',    label: 'Inicio' },
  { id: 'ads',     label: 'Anuncios' },
  { id: 'reports', label: 'Reportar' },
];

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
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Mis anuncios guardados en localStorage
  const [myNotices, setMyNotices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('myNotices') || '[]'); } catch { return []; }
  });

  // Validar tokens locales contra la BD para detectar eliminaciones externas (admin)
  useEffect(() => {
    async function validateMyNotices() {
      const stored = myNotices.filter(n => !n.deleted);
      if (stored.length === 0) return;

      const tokens = stored.map(n => n.token);
      const { data, error } = await supabase
        .from('notices')
        .select('edit_token')
        .in('edit_token', tokens);

      if (error) return; // si falla la consulta, no tocar nada

      const existingTokens = new Set((data || []).map(d => d.edit_token));
      let changed = false;
      const updated = myNotices.map(n => {
        if (!n.deleted && !existingTokens.has(n.token)) {
          changed = true;
          return { ...n, deleted: true };
        }
        return n;
      });

      if (changed) {
        setMyNotices(updated);
        localStorage.setItem('myNotices', JSON.stringify(updated));
      }
    }
    validateMyNotices();
  }, []); // solo al montar
  const [showMyNotices, setShowMyNotices] = useState(false);

  // Comprobar sesión de usuario y rol admin
  useEffect(() => {
    // El email del admin se define en .env como VITE_ADMIN_EMAIL
    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

    const handleSession = async (session) => {
      if (session) {
        // Comprobar si es la cuenta de admin por email (es más fiable que la BD)
        const isAdminAccount = ADMIN_EMAIL && session.user.email === ADMIN_EMAIL;
        if (isAdminAccount) {
          setIsAdmin(true);
          setCurrentUser(null); // El admin no tiene perfil público
          return;
        }

        // Usuario normal: cargar su perfil de la BD con columnas seguras
        const { data } = await supabase
          .from('profiles')
          .select('id, username, bio, tags, social_links, avatar_url, created_at')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setCurrentUser(data);
          setIsAdmin(false);
        } else {
          setCurrentUser({ id: session.user.id, email: session.user.email });
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
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
    const updated = [{ title, token: editToken, date: new Date().toLocaleDateString(), deleted: false }, ...myNotices];
    setMyNotices(updated);
    localStorage.setItem('myNotices', JSON.stringify(updated));
  };

  const dismissDeletedNotice = (token) => {
    const updated = myNotices.filter(n => n.token !== token);
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
    // Refrescar con la misma query optimizada del fetch inicial
    const BASE_SELECT = 'id, title, description, tag, location, price, contact_type, contact_value, contacts, image_url, images, created_at, user_id';
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data } = await supabase
      .from('notices')
      .select(BASE_SELECT)
      .gte('created_at', fourteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setNotices(data);
  };

  // Fetch notices — sin join a profiles para evitar errores de schema,
  // con filtro de fecha en servidor y límite para máxima velocidad
  useEffect(() => {
    async function fetchNotices() {
      const BASE_SELECT = 'id, title, description, tag, location, price, contact_type, contact_value, contacts, image_url, images, created_at, user_id';
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data } = await supabase
        .from('notices')
        .select(BASE_SELECT)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) setNotices(data);
      setIsLoading(false);
    }
    fetchNotices();
  }, []);

  const filteredNotices = notices.filter(n => {
    const matchesCategory = activeFilter === 'Todos' || n.tag === activeFilter;
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (n.title && String(n.title).toLowerCase().includes(lowerQuery)) ||
      (n.description && String(n.description).toLowerCase().includes(lowerQuery));
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

    const noticePayload = { ...formData, image_url: imagesUrls[0] || null, images: imagesUrls };

    // Vincular con usuario si hay sesión activa (por id, independientemente de si tiene perfil completo)
    if (currentUser && currentUser.id) {
      noticePayload.user_id = currentUser.id;
    }

    // INSERT sin join a profiles para mayor compatibilidad
    const { data, error } = await supabase
      .from('notices')
      .insert([noticePayload])
      .select('*');

    if (error) {
      console.error('Error insertando en la DB', error);
      // Si falla por user_id (columna no existe aún), reintentar sin él
      if (error.code === '42703' || error.message?.includes('user_id')) {
        delete noticePayload.user_id;
        const retry = await supabase.from('notices').insert([noticePayload]).select('*');
        if (retry.error) throw retry.error;
        if (retry.data && retry.data.length > 0) {
          const newNotice = { ...retry.data[0], profiles: null };
          setNotices([newNotice, ...notices]);
          if (retry.data[0].edit_token) saveTokenLocally(formData.title, retry.data[0].edit_token);
        }
        return;
      }
      if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw error;
    }
    if (data && data.length > 0) {
      // Enriquecer con datos del perfil local si está disponible (evita un fetch extra)
      const newNotice = {
        ...data[0],
        profiles: currentUser?.username ? { username: currentUser.username } : null
      };
      setNotices([newNotice, ...notices]);
      if (data[0].edit_token) {
        saveTokenLocally(formData.title, data[0].edit_token);
      }
      return data[0];
    }
  };

  // Pestañas disponibles: el admin ve todas, el público solo las activas
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
        
        <div className="header-left" style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          {/* Symmetrical spacer for centering title */}
        </div>

        <h1 className="header-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)', flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>
          SVQ_PROYECTOS_MUSICALES
        </h1>

        <div className="header-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
          {isAdmin && (
            <div style={{ color: 'var(--neon-pink)', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid var(--neon-pink)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>ADMIN</div>
          )}
          
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a href={`/profile/${currentUser.id}`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }} title="Mi Perfil">
                <User size={16} /> <span className="hide-on-mobile">{currentUser.username || 'Perfil'}</span>
              </a>
              <button onClick={() => supabase.auth.signOut()} className="btn" style={{ padding: '8px', color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', background: 'transparent' }} title="Cerrar Sesión">
                <LogOut size={16} />
              </button>
            </div>
          ) : !isAdmin && (
            <button onClick={() => setIsAuthModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
              <LogIn size={16} /> <span className="hide-on-mobile">Acceder</span>
            </button>
          )}

          {isAdmin && !currentUser && (
            <button onClick={() => supabase.auth.signOut()} className="btn" style={{ padding: '8px', color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', background: 'transparent' }} title="Cerrar Sesión">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      {visibleTabs.length > 1 && (
        <nav style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', padding: '0 2rem', backgroundColor: 'var(--surface-color)', gap: '4px' }}>
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
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 1.5rem auto', letterSpacing: '0.05em' }}>
                TABLÓN DE ANUNCIOS POR Y PARA ARTISTAS DE LA ESCENA SEVILLANA
              </p>
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ fontSize: '1rem', padding: '12px 28px' }}>
                <Plus size={18} /> Publicar Anuncio
              </button>
            </section>

            {/* Buscador + Mis Anuncios */}
            <section style={{ maxWidth: '600px', margin: '0 auto 2rem auto', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: myNotices.some(n => n.deleted) ? 'var(--neon-pink)' : 'var(--neon-green)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{myNotices.length}</span>
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
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: n.deleted ? 'rgba(255, 42, 109, 0.08)' : 'rgba(0,0,0,0.2)', border: `1px solid ${n.deleted ? 'var(--neon-pink)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-sm)', opacity: n.deleted ? 0.85 : 1 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: n.deleted ? 'line-through' : 'none', color: n.deleted ? 'var(--text-secondary)' : 'inherit' }}>{n.title}</span>
                          {n.deleted ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--neon-pink)', fontWeight: 600 }}>⚠️ Eliminado por un administrador</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.date}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {n.deleted ? (
                            <button onClick={() => dismissDeletedNotice(n.token)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} title="Quitar de la lista">
                              Quitar
                            </button>
                          ) : (
                            <>
                              <a href={`/edit/${n.token}`} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }} title="Editar o ver detalles">Editar</a>
                              <button onClick={() => handleDeleteNotice(n.token)} style={{ color: 'var(--neon-pink)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }} title="Borrar anuncio de la plataforma">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
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
            <div className="notices-grid">
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

      {isAuthModalOpen && (
        <Suspense fallback={<div>Cargando...</div>}>
          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </Suspense>
      )}


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
