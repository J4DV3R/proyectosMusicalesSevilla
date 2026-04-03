import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { containsBadWords } from '../lib/badWords';

export default function EditProfileModal({ isOpen, onClose, userProfile, onProfileUpdate }) {
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    tags: [],
    social_links: []
  });
  const [tagInput, setTagInput] = useState('');
  const [socialType, setSocialType] = useState('instagram');
  const [socialValue, setSocialValue] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Cargar datos actuales
  useEffect(() => {
    if (userProfile && isOpen) {
      setFormData({
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        tags: userProfile.tags || [],
        social_links: userProfile.social_links || []
      });
      setTagInput('');
      setSocialValue('');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addTag = () => {
    const cleanTag = tagInput.trim();
    if (!cleanTag) return;
    if (formData.tags.length >= 3) {
      return alert("Máximo 3 tags permitidos.");
    }
    if (formData.tags.includes(cleanTag)) {
      return alert("Este tag ya está añadido.");
    }
    if (containsBadWords(cleanTag)) {
       return alert("Por favor modera tu vocabulario en los tags.");
    }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, cleanTag] }));
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const addSocial = () => {
    const cleanValue = socialValue.trim();
    if (!cleanValue) return;
    if (formData.social_links.length >= 6) {
      return alert("Máximo 6 enlaces sociales permitidos.");
    }
    setFormData(prev => ({ ...prev, social_links: [...prev.social_links, { type: socialType, value: cleanValue }] }));
    setSocialValue('');
  };

  const removeSocial = (index) => {
    setFormData(prev => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (containsBadWords(formData.username) || containsBadWords(formData.bio)) {
      return alert("Por favor, lenguaje moderado en tu perfil público.");
    }

    if (!formData.username.trim()) {
      return alert("El alias no puede estar vacío.");
    }

    setLoading(true);
    try {
      // Actualizar en base de datos. Asumimos RLS (sólo podrá hacer update a sí mismo)
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          tags: formData.tags,
          social_links: formData.social_links,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) {
        if (error.code === '23505') throw new Error("Ese nombre de usuario ya está cogido. ¡Sé original!");
        throw error;
      }
      
      alert("¡Perfil actualizado con éxito!");
      onProfileUpdate({ ...userProfile, ...formData });
      onClose();
    } catch (error) {
      alert(error.message || "Error guardando el perfil.");
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

        {/* Formulatio */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Alias / Nombre de Proyecto *</label>
            <input required type="text" name="username" value={formData.username} onChange={handleChange} className="input-base" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Biografía corta</label>
            <textarea name="bio" rows="3" value={formData.bio} onChange={handleChange} className="input-base" placeholder="Cuéntanos un poco sobre ti o tu proyecto..." style={{ resize: 'vertical' }}></textarea>
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
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="input-base" placeholder="Nuevo Tag" style={{ flex: 1 }} />
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
                <input type="text" value={socialValue} onChange={e => setSocialValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSocial())} className="input-base" placeholder="@usuario o URL" style={{ flex: 1, minWidth: '200px' }} />
                <button type="button" onClick={addSocial} className="btn btn-secondary" style={{ padding: '0 16px' }}><Plus size={18}/></button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} style={{ marginRight: '8px' }}/> {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
