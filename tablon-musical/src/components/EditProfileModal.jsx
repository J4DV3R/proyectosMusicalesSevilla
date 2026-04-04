import React, { useState, useEffect, useRef } from 'react';
import { supabase, uploadAvatar, sanitizeText } from '../lib/supabase';
import { X, Save, Plus, Trash2, Camera, User } from 'lucide-react';
import { containsBadWords } from '../lib/badWords';

export default function EditProfileModal({ isOpen, onClose, userProfile, onProfileUpdate }) {
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    tags: [],
    social_links: [],
    avatar_url: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [socialType, setSocialType] = useState('instagram');
  const [socialValue, setSocialValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [nsfwModel, setNsfwModel] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userProfile && isOpen) {
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        tags: userProfile.tags || [],
        social_links: userProfile.social_links || [],
        avatar_url: userProfile.avatar_url || ''
      });
      setAvatarPreview(userProfile.avatar_url || null);
      setTagInput('');
      setSocialValue('');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── AVATAR CON FILTRO NSFW ──
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    try {
      // Validaciones básicas de archivo
      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!ALLOWED.includes(file.type)) throw new Error('Solo se permiten imágenes JPG, PNG, WebP o GIF.');
      if (file.size > 5 * 1024 * 1024) throw new Error('La imagen no puede superar los 5MB.');

      // Análisis NSFW
      let activeModel = nsfwModel;
      if (!activeModel) {
        await import('@tensorflow/tfjs');
        const nsfwModule = await import('nsfwjs');
        activeModel = await nsfwModule.load();
        setNsfwModel(activeModel);
      }

      const isNsfw = await new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
          try {
            const predictions = await activeModel.classify(img);
            const flagged = predictions.some(p =>
              (p.className === 'Porn' || p.className === 'Hentai') && p.probability > 0.6
            );
            resolve(flagged);
          } catch { resolve(false); }
        };
        img.onerror = () => resolve(false);
      });

      if (isNsfw) throw new Error('La imagen ha sido rechazada por contenido inapropiado.');

      // Preview local
      setAvatarPreview(URL.createObjectURL(file));

      // Subir a Supabase
      const url = await uploadAvatar(file);
      setFormData(prev => ({ ...prev, avatar_url: url }));
    } catch (err) {
      alert(err.message || 'Error al procesar la imagen.');
      setAvatarPreview(formData.avatar_url || null);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── TAGS ──
  const addTag = () => {
    const cleanTag = sanitizeText(tagInput.trim());
    if (!cleanTag) return;
    if (formData.tags.length >= 3) return alert('Máximo 3 tags permitidos.');
    if (formData.tags.includes(cleanTag)) return alert('Este tag ya está añadido.');
    if (containsBadWords(cleanTag)) return alert('Por favor modera tu vocabulario en los tags.');
    setFormData(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  // ── REDES SOCIALES ──
  const addSocial = () => {
    const cleanValue = sanitizeText(socialValue.trim());
    if (!cleanValue) return;
    if (formData.social_links.length >= 6) return alert('Máximo 6 enlaces permitidos.');
    setFormData(prev => ({ ...prev, social_links: [...prev.social_links, { type: socialType, value: cleanValue }] }));
    setSocialValue('');
  };

  const removeSocial = (index) => {
    setFormData(prev => ({ ...prev, social_links: prev.social_links.filter((_, i) => i !== index) }));
  };

  // ── GUARDAR ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = sanitizeText(formData.username.trim());
    const cleanBio = sanitizeText(formData.bio.trim());

    if (!cleanUsername) return alert('El alias no puede estar vacío.');
    if (containsBadWords(cleanUsername) || containsBadWords(cleanBio))
      return alert('Por favor, lenguaje moderado en tu perfil público.');

    setLoading(true);
    try {
      // Solo actualizamos columnas que sabemos que existen en profiles
      const updatePayload = {
        username: cleanUsername,
        bio: cleanBio,
        tags: formData.tags,
        social_links: formData.social_links,
        avatar_url: formData.avatar_url || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userProfile.id);

      if (error) {
        // Si falla por columna inexistente (avatar_url, tags, social_links),
        // reintentamos con solo los campos básicos
        if (error.code === '42703' || error.message?.includes('column')) {
          const basicPayload = { username: cleanUsername, bio: cleanBio };
          const retry = await supabase
            .from('profiles')
            .update(basicPayload)
            .eq('id', userProfile.id);
          if (retry.error) {
            if (retry.error.code === '23505') throw new Error('Ese nombre de usuario ya está cogido. ¡Sé original!');
            throw retry.error;
          }
        } else {
          if (error.code === '23505') throw new Error('Ese nombre de usuario ya está cogido. ¡Sé original!');
          throw error;
        }
      }

      onProfileUpdate({ ...userProfile, ...formData, username: cleanUsername, bio: cleanBio });
      onClose();
    } catch (error) {
      alert(error.message || 'Error guardando el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: '600px', borderRadius: 'var(--border-radius-md)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>

        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--neon-purple)' }}>EDITAR PERFIL</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* AVATAR */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div
              onClick={() => !avatarLoading && fileInputRef.current?.click()}
              style={{
                width: '110px', height: '110px', borderRadius: '50%',
                border: '2px solid var(--neon-purple)', cursor: avatarLoading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(0,0,0,0.4)',
                transition: 'border-color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.querySelector('.avatar-overlay').style.opacity = '1'}
              onMouseOut={e => e.currentTarget.querySelector('.avatar-overlay').style.opacity = '0'}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={48} color="var(--text-secondary)" />
              }
              <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', flexDirection: 'column', gap: '4px' }}>
                <Camera size={20} color="#fff" />
                <span style={{ color: '#fff', fontSize: '0.7rem' }}>Cambiar</span>
              </div>
              {avatarLoading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', fontFamily: 'monospace' }}>ANALIZANDO...</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Haz clic en la imagen para cambiar tu avatar<br/>
              <span style={{ color: 'var(--neon-purple)', opacity: 0.7 }}>JPG, PNG o WebP · Máx. 5MB · Filtro NSFW activo</span>
            </p>
          </div>

          {/* Username */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Alias / Nombre de Proyecto *</label>
            <input required type="text" name="username" value={formData.username} onChange={handleChange} className="input-base" maxLength={40} />
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Biografía corta</label>
            <textarea name="bio" rows="3" value={formData.bio} onChange={handleChange} className="input-base" placeholder="Cuéntanos un poco sobre ti o tu proyecto..." maxLength={400} style={{ resize: 'vertical' }}></textarea>
          </div>

          {/* Tags */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Etiquetas (Ej: Productor, Metal, Bajista) - Max 3</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {formData.tags.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', backgroundColor: 'rgba(0, 243, 255, 0.1)', color: 'var(--neon-blue)', border: '1px solid var(--neon-blue)' }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14}/></button>
                </span>
              ))}
            </div>
            {formData.tags.length < 3 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="input-base" placeholder="Nuevo Tag" maxLength={30} style={{ flex: 1 }} />
                <button type="button" onClick={addTag} className="btn btn-secondary" style={{ padding: '0 16px' }}>Añadir</button>
              </div>
            )}
          </div>

          {/* Redes Sociales */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Redes Sociales / Enlaces (Max 6)</label>
            {formData.social_links.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                {formData.social_links.map((link, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--surface-color)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--bg-color)', borderRadius: '4px', color: 'var(--neon-green)', textTransform: 'uppercase' }}>{link.type}</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{link.value}</span>
                    </div>
                    <button type="button" onClick={() => removeSocial(idx)} style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            )}
            {formData.social_links.length < 6 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={socialType} onChange={e => setSocialType(e.target.value)} className="input-base" style={{ width: '140px' }}>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="spotify">Spotify</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="bandcamp">Bandcamp</option>
                  <option value="youtube">YouTube</option>
                  <option value="link">Otro Enlace</option>
                </select>
                <input type="text" value={socialValue} onChange={e => setSocialValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSocial())} className="input-base" placeholder="@usuario o URL" maxLength={200} style={{ flex: 1, minWidth: '200px' }} />
                <button type="button" onClick={addSocial} className="btn btn-secondary" style={{ padding: '0 16px' }}><Plus size={18}/></button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || avatarLoading}>
              <Save size={18} style={{ marginRight: '8px' }}/> {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
