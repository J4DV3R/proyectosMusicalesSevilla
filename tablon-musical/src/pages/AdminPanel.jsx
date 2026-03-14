import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2 } from 'lucide-react';

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  const [notices, setNotices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

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
      </main>
    </div>
  );
}
