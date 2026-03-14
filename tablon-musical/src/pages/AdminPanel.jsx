import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Plus } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  const [notices, setNotices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // States para categorías
  const { categories, addCategory, deleteCategory } = useCategories();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#39ff14'); // Por defecto verde neon
  const [newCatBg, setNewCatBg] = useState('rgba(57, 255, 20, 0.1)');
  const [loadingCat, setLoadingCat] = useState(false);

  const fetchAllNotices = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setNotices(data);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllNotices();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllNotices();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoadingLogin(false);
    
    if (error) {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setNotices([]);
  };

  const forceDelete = async (id) => {
    if (!window.confirm("¿BORRAR COMO ADMINISTRADOR? (Esta acción no requiere token y es irreversible)")) return;
    
    const { error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id);
      
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
    // Basic protection against deleting everything
    if (categories.length <= 1) {
      return alert("Debe existir al menos 1 categoría en el sistema.");
    }
    
    if (!window.confirm(`¿Estás seguro de que quieres borrar la categoría "${name}"? Los anuncios que la usen podrían verse mal.`)) return;
    
    try {
      await deleteCategory(id);
    } catch (err) {
      alert("Error al intentar borrar la categoría.");
      console.error(err);
    }
  };

  if (!session) {
    return (
      <div className="app-container" style={{ backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--border-radius-md)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ color: 'var(--neon-pink)', marginBottom: '1.5rem', textAlign: 'center' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="email" 
              placeholder="Email Admin" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="input-base" 
              required 
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="input-base" 
              required 
            />
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

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-pink)' }}>
          <span style={{ fontSize: '1.5rem' }}>🔌</span> OJO QUE TODO LO VE (ADMIN)
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleLogout} className="btn" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>
            CERRAR SESIÓN
          </button>
          <a href="/" className="btn" style={{ borderColor: 'var(--neon-blue)', color: 'var(--neon-blue)' }}>
            VER TABLÓN
          </a>
        </div>
      </header>
      
      <main className="main-content">
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
                    <td style={{ padding: '1rem' }}>{notice.title.substring(0, 30)}...</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-color)', fontSize: '0.85rem' }}>{notice.tag}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{notice.contact_value}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <a href={`/edit/${notice.edit_token}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                        Ver Edit
                      </a>
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

        <h2 style={{ marginBottom: '1.5rem', marginTop: '3rem', color: 'var(--text-primary)' }}>ETIQUETAS DINÁMICAS (CATEGORÍAS)</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Creador de Etiquetas */}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Color Fondo (Tipo CSS)</label>
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

          {/* Listado de Etiquetas Existentes */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--border-radius-md)', maxHeight: '450px', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>ETIQUETAS ACTUALES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: cat.color, backgroundColor: cat.bg_color }}>
                    {cat.name}
                  </span>
                  
                  <button onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer', background: 'transparent', border: 'none', transition: 'color 0.2s' }} title="Borrar Categoría" onMouseOver={e => e.currentTarget.style.color='var(--neon-pink)'} onMouseOut={e => e.currentTarget.style.color='var(--text-secondary)'}>
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
    </div>
  );
}
