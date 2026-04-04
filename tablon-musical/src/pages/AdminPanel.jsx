import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Plus, Sun, Moon, Eye, EyeOff, Shield, ShieldOff, UserX } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const { darkMode, toggleTheme } = useTheme();

  const [notices, setNotices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Categorías
  const { categories, addCategory, deleteCategory } = useCategories();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#39ff14');
  const [newCatBg, setNewCatBg] = useState('rgba(57, 255, 20, 0.1)');
  const [loadingCat, setLoadingCat] = useState(false);

  // Visibilidad de pestañas
  const [tabVisibility, setTabVisibility] = useState({ home: true, ads: true, reports: true });
  const [savingSettings, setSavingSettings] = useState(false);

  // Reportes
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [blockModal, setBlockModal] = useState(null); // { userId, username }
  const [blockDays, setBlockDays] = useState(7);
  const [blockReason, setBlockReason] = useState('');

  const fetchAllNotices = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setNotices(data);
    setLoadingData(false);
  };

  const fetchTabSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'tabs_visibility')
      .single();
    if (data?.value) setTabVisibility(data.value);
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data);
    setLoadingReports(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, is_blocked, blocked_until, block_reason, is_admin, created_at')
      .eq('is_admin', false)
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoadingUsers(false);
  };

  useEffect(() => {
    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

    const handleSession = (session) => {
      // Verificar que quien accede sea exactamente el admin por email
      if (session && ADMIN_EMAIL && session.user.email === ADMIN_EMAIL) {
        setSession(session);
        fetchAllNotices();
        fetchTabSettings();
        fetchReports();
        fetchUsers();
      } else if (session) {
        // Usuario autenticado pero NO es el admin — expulsarlo
        supabase.auth.signOut().then(() => {
          window.location.href = '/';
        });
      } else {
        setSession(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoadingLogin(false);
    if (error) alert(error.message);
  };

  const handleBlockUser = async () => {
    if (!blockModal) return;
    const now = new Date();
    const until = new Date(now.getTime() + blockDays * 24 * 60 * 60 * 1000);
    const { error } = await supabase.rpc('admin_block_user', {
      p_user_id: blockModal.userId,
      p_blocked_until: until.toISOString(),
      p_reason: blockReason || null
    });
    if (error) { alert('Error al bloquear: ' + error.message); return; }
    setUsers(prev => prev.map(u =>
      u.id === blockModal.userId ? { ...u, is_blocked: true, blocked_until: until.toISOString(), block_reason: blockReason || null } : u
    ));
    setBlockModal(null);
    setBlockReason('');
    setBlockDays(7);
  };

  const handleUnblockUser = async (userId) => {
    const { error } = await supabase.rpc('admin_unblock_user', { p_user_id: userId });
    if (error) { alert('Error al desbloquear: ' + error.message); return; }
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, is_blocked: false, blocked_until: null, block_reason: null } : u
    ));
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`¿Eliminar permanentemente la cuenta de "${username}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setNotices([]);
  };

  const forceDelete = async (id) => {
    if (!window.confirm("¿BORRAR COMO ADMINISTRADOR? (Esta acción no requiere token y es irreversible)")) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      alert("Error al borrar.");
      console.error(error);
    } else {
      setNotices(notices.filter(n => n.id !== id));
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    setLoadingCat(true);
    try {
      await addCategory(newCatName, newCatColor, newCatBg);
      setNewCatName('');
    } catch (err) {
      alert("Error creando la categoría. Asegúrate de que no exista ya otra con el mismo nombre.");
      console.error(err);
    }
    setLoadingCat(false);
  };

  const handleDeleteCategory = async (id, name) => {
    if (categories.length <= 1) return alert("Debe existir al menos 1 categoría en el sistema.");
    if (!window.confirm(`¿Estás seguro de que quieres borrar la categoría "${name}"? Los anuncios que la usen podrían verse mal.`)) return;
    try {
      await deleteCategory(id);
    } catch (err) {
      alert("Error al intentar borrar la categoría.");
      console.error(err);
    }
  };

  // Guardar visibilidad de pestañas en Supabase
  const handleToggleTab = async (tabId) => {
    const newVisibility = { ...tabVisibility, [tabId]: !tabVisibility[tabId] };
    setTabVisibility(newVisibility);
    setSavingSettings(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: newVisibility, updated_at: new Date().toISOString() })
      .eq('id', 'tabs_visibility');
    if (error) {
      alert('Error al guardar la configuración. ¿Está creada la tabla site_settings?');
      console.error(error);
      setTabVisibility(tabVisibility);
    }
    setSavingSettings(false);
  };

  const handleUpdateReportStatus = async (id, newStatus) => {
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', id);
    if (!error) setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('¿Borrar este reporte definitivamente?')) return;
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (!error) setReports(reports.filter(r => r.id !== id));
  };

  // ── PANTALLA DE LOGIN ──
  if (!session) {
    return (
      <div className="app-container" style={{ backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--border-radius-md)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '1.5rem', textAlign: 'center' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="email" placeholder="Email Admin" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" required />
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="input-base" required />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', borderColor: 'var(--neon-pink)', background: 'transparent', color: 'var(--neon-pink)' }} disabled={loadingLogin}>
              {loadingLogin ? 'VERIFICANDO...' : 'ENTRAR AL MASTER'}
            </button>
            <a href="/" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              VOLVER A ZONA PÚBLICA
            </a>
          </form>
        </div>
      </div>
    );
  }

  // ── PANEL PRINCIPAL ──
  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-pink)' }}>
          <span style={{ fontSize: '1.5rem' }}>🔌</span> OJO QUE TODO LO VE (ADMIN)
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleLogout} className="btn" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>CERRAR SESIÓN</button>
          <a href="/" className="btn" style={{ borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }}>VER TABLÓN</a>
        </div>
      </header>

      <main className="main-content">

        {/* ════ VISIBILIDAD DE PESTAÑAS ════ */}
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>CONTROL DE PESTAÑAS</h2>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', marginBottom: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Activa o desactiva cada pestaña para el público. <strong style={{ color: 'var(--neon-pink)' }}>Tú, como admin, siempre puedes verlas todas</strong> (aparecen marcadas con 👁️ si están ocultas).
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { id: 'home',    label: 'Inicio' },
              { id: 'ads',     label: 'Anuncios' },
              { id: 'reports', label: 'Reportar' },
            ].map(tab => {
              const isVisible = tabVisibility[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => handleToggleTab(tab.id)}
                  disabled={savingSettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 20px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: `2px solid ${isVisible ? 'var(--neon-green)' : 'var(--border-color)'}`,
                    background: isVisible ? 'rgba(57,255,20,0.08)' : 'rgba(255,255,255,0.03)',
                    color: isVisible ? 'var(--neon-green)' : 'var(--text-secondary)',
                    cursor: savingSettings ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  {tab.label}
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: isVisible ? 'var(--neon-green)' : 'var(--border-color)',
                    color: isVisible ? '#000' : 'var(--text-secondary)',
                  }}>
                    {isVisible ? 'VISIBLE' : 'OCULTA'}
                  </span>
                </button>
              );
            })}
          </div>
          {savingSettings && <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Guardando…</p>}
        </div>

        {/* ════ GESTIÓN DE REPORTES ════ */}
        <h2 style={{ marginBottom: '1.5rem', marginTop: '3rem', color: 'var(--text-primary)' }}>REPORTES Y SUGERENCIAS</h2>
        {loadingReports ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando reportes...</p>
        ) : reports.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay reportes todavía. ¡Buena señal!
          </div>
        ) : (
          <div className="glass-panel" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>FECHA</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>TIPO</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>DESCRIPCIÓN</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>CONTACTO</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>ESTADO</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>KILL</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => {
                  const statusColor = report.status === 'resuelto' ? 'var(--neon-green)' : report.status === 'leído' ? 'var(--neon-blue)' : 'var(--neon-pink)';
                  return (
                    <tr key={report.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: report.status === 'resuelto' ? 0.55 : 1 }}>
                      <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, color: report.type === 'Error' ? 'var(--neon-pink)' : report.type === 'Sugerencia' ? 'var(--neon-green)' : 'var(--neon-blue)' }}>
                        {report.type}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', maxWidth: '350px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.description}>
                          {report.description}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {report.contact || '—'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <select
                          value={report.status}
                          onChange={e => handleUpdateReportStatus(report.id, e.target.value)}
                          style={{
                            background: 'var(--surface-color)',
                            border: `1px solid ${statusColor}`,
                            color: statusColor,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="leído">Leído</option>
                          <option value="resuelto">Resuelto</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteReport(report.id)} style={{ color: 'var(--neon-pink)', padding: '8px', cursor: 'pointer', background: 'none', border: 'none' }} title="Borrar reporte">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ════ GESTIÓN DE ANUNCIOS ════ */}
        <h2 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>GESTIÓN CENTRAL</h2>
        {loadingData ? (
          <p>Cargando datos maestros...</p>
        ) : (
          <div className="glass-panel" style={{ borderRadius: 'var(--border-radius-md)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>DATE</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>TITULAR</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>CATEGORÍA</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>CONTACTO</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>LINK EDICIÓN</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>KILL</th>
                </tr>
              </thead>
              <tbody>
                {notices.map(notice => (
                  <tr key={notice.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(notice.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>{String(notice.title || '').substring(0, 30)}...</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-color)', fontSize: '0.85rem' }}>{notice.tag}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {notice.contacts && notice.contacts.length > 0 
                        ? notice.contacts.map(c => c.value).join(', ') 
                        : notice.contact_value || 'Sin contacto'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <a href={`/edit/${notice.edit_token}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Ver Edit</a>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button onClick={() => forceDelete(notice.id)} style={{ color: 'var(--neon-pink)', padding: '8px', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ════ ETIQUETAS ════ */}
        <h2 style={{ marginBottom: '1.5rem', marginTop: '3rem', color: 'var(--text-primary)' }}>ETIQUETAS DINÁMICAS (CATEGORÍAS)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

          {/* Creador */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>NUEVA ETIQUETA</h3>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Nombre de Categoría</label>
                <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="input-base" placeholder="Ej. Clases Particulares" />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Color Texto</label>
                  <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} style={{ width: '100%', height: '40px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Color Fondo (CSS)</label>
                  <input type="text" value={newCatBg} onChange={e => setNewCatBg(e.target.value)} className="input-base" placeholder="rgba(0,0,0,0.5)" />
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', padding: '1rem', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>PREVISUALIZACIÓN:</span>
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: newCatColor, backgroundColor: newCatBg }}>
                  {newCatName || 'NUEVO TAG'}
                </span>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loadingCat} style={{ marginTop: '0.5rem' }}>
                <Plus size={16} /> {loadingCat ? 'CREANDO...' : 'AÑADIR CATEGORÍA'}
              </button>
            </form>
          </div>

          {/* Listado */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', maxHeight: '450px', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>ETIQUETAS ACTUALES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: cat.color, backgroundColor: cat.bg_color }}>
                    {cat.name}
                  </span>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer', background: 'transparent', border: 'none', transition: 'color 0.2s' }} title="Borrar Categoría" onMouseOver={e => e.currentTarget.style.color = 'var(--neon-pink)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>Cargando categorías...</span>}
            </div>
            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              * Cuidado: Borrar una categoría en uso obligará a esos anuncios a adoptar la categoría "Por defecto" en las tarjetas de la pantalla pública.
            </p>
          </div>

        </div>
      </main>

      {/* ════ GESTIÓN DE USUARIOS ════ */}
      <main className="main-content">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>CUENTAS DE USUARIO</h2>
        {loadingUsers ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--border-radius-md)', marginBottom: '3rem' }}>
            No hay usuarios registrados todavía.
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(user => {
              const isBlocked = user.is_blocked && (!user.blocked_until || new Date(user.blocked_until) > new Date());
              const blockedUntil = user.blocked_until ? new Date(user.blocked_until).toLocaleDateString('es-ES') : null;
              return (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: isBlocked ? 'rgba(255,42,109,0.08)' : 'rgba(0,0,0,0.3)', border: `1px solid ${isBlocked ? 'var(--neon-pink)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-sm)', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</span>
                    {isBlocked && (
                      <span style={{ marginLeft: '12px', fontSize: '0.78rem', color: 'var(--neon-pink)', border: '1px solid var(--neon-pink)', padding: '2px 8px', borderRadius: '12px' }}>
                        BLOQUEADO{blockedUntil ? ` hasta ${blockedUntil}` : ''}
                      </span>
                    )}
                    {user.block_reason && isBlocked && (
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Motivo: {user.block_reason}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isBlocked ? (
                      <button onClick={() => handleUnblockUser(user.id)} className="btn" style={{ padding: '6px 14px', borderColor: 'var(--neon-green)', color: 'var(--neon-green)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldOff size={14} /> Desbloquear
                      </button>
                    ) : (
                      <button onClick={() => setBlockModal({ userId: user.id, username: user.username })} className="btn" style={{ padding: '6px 14px', borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} /> Bloquear
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(user.id, user.username)} style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--neon-pink)', color: 'var(--neon-pink)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Eliminar cuenta">
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL BLOQUEO */}
      {blockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', borderRadius: 'var(--border-radius-md)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ color: 'var(--neon-pink)' }}>🚫 Bloquear a "{blockModal.username}"</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duración del bloqueo</label>
              <select value={blockDays} onChange={e => setBlockDays(Number(e.target.value))} className="input-base">
                <option value={1}>1 día</option>
                <option value={3}>3 días</option>
                <option value={7}>1 semana</option>
                <option value={14}>2 semanas</option>
                <option value={30}>1 mes (máximo)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Motivo (opcional)</label>
              <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ej. Contenido inapropiado" className="input-base" maxLength={200} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setBlockModal(null); setBlockReason(''); setBlockDays(7); }} className="btn" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={handleBlockUser} className="btn btn-primary" style={{ borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)', backgroundColor: 'rgba(255,42,109,0.1)' }}>
                Confirmar Bloqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante de tema */}
      <button
        onClick={toggleTheme}
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
