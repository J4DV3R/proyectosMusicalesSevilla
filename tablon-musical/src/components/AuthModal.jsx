import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validatePassword, sanitizeText } from '../lib/supabase';
import { X, LogIn, UserPlus } from 'lucide-react';

// Traducción de errores de Supabase al español
const traducirError = (msg) => {
  if (!msg) return 'Error desconocido. Inténtalo de nuevo.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return 'Email o contraseña incorrectos.';
  if (m.includes('email not confirmed'))
    return 'Debes confirmar tu correo electrónico antes de entrar. Revisa tu bandeja de entrada.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Este correo ya tiene una cuenta registrada. Inicia sesión.';
  if (m.includes('password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email address'))
    return 'El formato del correo no es válido.';
  if (m.includes('email address not authorized'))
    return 'Este correo electrónico no está autorizado.';
  if (m.includes('signup is disabled'))
    return 'El registro de nuevos usuarios está desactivado temporalmente.';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.';
  // Si ya es un mensaje nuestro en español, devolverlo tal cual
  return msg;
};

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

        // Bloquear admin: no puede loguearse como usuario normal
        const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
        if (ADMIN_EMAIL && authData.user?.email === ADMIN_EMAIL) {
          await supabase.auth.signOut();
          throw new Error("Esta cuenta es de administrador. Accede desde el panel /admin.");
        }

        // Comprobar si la cuenta está bloqueada
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_blocked, blocked_until, block_reason')
          .eq('id', authData.user.id)
          .single();

        if (profile?.is_blocked) {
          const now = new Date();
          const blockedUntil = profile.blocked_until ? new Date(profile.blocked_until) : null;
          if (!blockedUntil || blockedUntil > now) {
            await supabase.auth.signOut();
            const dateStr = blockedUntil
              ? blockedUntil.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'indefinidamente';
            const reason = profile.block_reason ? ` Motivo: ${profile.block_reason}.` : '';
            throw new Error(`Tu cuenta está bloqueada hasta el ${dateStr}.${reason}`);
          }
        }

        onClose();
      } else {
        if (!username) throw new Error('El nombre de usuario es obligatorio.');
        const cleanUsername = sanitizeText(username.trim());
        if (!cleanUsername) throw new Error('El nombre de usuario no puede estar vacío.');

        const passwordError = validatePassword(password);
        if (passwordError) throw new Error(passwordError);

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: cleanUsername } }
        });
        if (error) throw error;
        alert('¡Registro exitoso! Ya estás dentro.');
        onClose();
      }
    } catch (error) {
      setErrorMsg(traducirError(error.message));
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
              <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-base" placeholder="Ej. TheRockers, super_guitar..." maxLength={40} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Correo Electrónico *</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-base" placeholder="tu@email.com" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Contraseña *</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-base" placeholder={isLogin ? 'Tu contraseña' : '7-15 chars, incluye un símbolo (!@#...)'} minLength={isLogin ? 1 : 7} maxLength={15} />
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
