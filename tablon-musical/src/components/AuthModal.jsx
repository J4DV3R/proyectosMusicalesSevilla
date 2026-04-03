import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, LogIn, UserPlus } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Verificar si es una cuenta de admin
        if (authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', authData.user.id)
            .single();

          if (profile && profile.is_admin) {
            await supabase.auth.signOut();
            throw new Error("Esta cuenta es de administrador. Usa el panel Master.");
          }
        }
        onClose();
      } else {
        if (!username) {
          throw new Error("El nombre de usuario es obligatorio.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        });
        if (error) throw error;
        alert("¡Registro exitoso! Ya estás dentro (o revisa tu correo si pusiste validación de email).");
        onClose();
      }
    } catch (error) {
      setErrorMsg(error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}>
      
      <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: '400px', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: isLogin ? 'var(--neon-blue)' : 'var(--neon-green)' }}>
            {isLogin ? <><LogIn size={20}/> ACCEDER</> : <><UserPlus size={20}/> ÚNETE</>}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={24} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {errorMsg && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(255, 42, 109, 0.1)', border: '1px solid var(--neon-pink)', borderRadius: '4px', color: 'var(--neon-pink)', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Alias / Nombre Proyecto *</label>
              <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-base" placeholder="Ej. TheRockers, super_guitar..." />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Correo Electrónico *</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" placeholder="tu@email.com" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Contraseña *</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-base" placeholder="Mínimo 6 caracteres" minLength="6" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem', width: '100%', padding: '12px', fontSize: '1rem', backgroundColor: isLogin ? 'rgba(0, 243, 255, 0.1)' : 'rgba(57, 255, 20, 0.1)', borderColor: isLogin ? 'var(--neon-blue)' : 'var(--neon-green)', color: isLogin ? 'var(--neon-blue)' : 'var(--neon-green)' }}>
            {loading ? 'PROCESANDO...' : (isLogin ? 'ENTRAR' : 'REGISTRARME')}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLogin ? "¿No tienes cuenta en la escena? " : "¿Ya eres parte de la escena? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>
              {isLogin ? "Crea tu perfil" : "Inicia sesión"}
            </button>
          </p>

        </form>
      </div>
    </div>
  );
}
