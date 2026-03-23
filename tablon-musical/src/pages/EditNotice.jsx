import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, uploadImage } from '../lib/supabase';
import { Trash2, AlertTriangle, ArrowLeft, Upload, Image as ImageIcon, X, Save } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';

export default function EditNotice() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States for images
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  
  // States for the form
  const [formData, setFormData] = useState({});

  const { categories } = useCategories();
  
  useEffect(() => {
    async function fetchNotice() {
      // Intentamos buscar un anuncio que tenga este edit_token
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('edit_token', token)
        .single();
        
      if (error || !data) {
        alert("Enlace secreto inválido o el anuncio ya fue borrado.");
        navigate('/');
      } else {
        // Procesar contactos
        let email = '', phone = '', instagram = '', other = '';
        if (data.contacts && Array.isArray(data.contacts) && data.contacts.length > 0) {
          data.contacts.forEach(c => {
            if (c.type === 'email') email = c.value;
            if (c.type === 'phone') phone = c.value;
            if (c.type === 'instagram') instagram = c.value;
            if (c.type === 'other') other = c.value;
          });
        } else if (data.contact_value) {
          const t = data.contact_type || 'other';
          if (t === 'email') email = data.contact_value;
          if (t === 'phone') phone = data.contact_value;
          if (t === 'instagram') instagram = data.contact_value;
          if (t === 'other') other = data.contact_value;
        }

        setFormData({
          title: data.title,
          description: data.description,
          tag: data.tag,
          location: data.location || '',
          price: data.price || '',
          contactEmail: email,
          contactPhone: phone,
          contactInstagram: instagram,
          contactOther: other
        });
        
        // Cargar array de imagenes (priorizando 'images' jsonb, o 'image_url' antiguo si no existe el campo)
        if (data.images !== null && data.images !== undefined) {
          setExistingImages(data.images);
        } else if (data.image_url) {
          setExistingImages([data.image_url]);
        }
      }
      setLoading(false);
    }
    fetchNotice();
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (existingImages.length + newFiles.length + selectedFiles.length > 3) {
        return alert("El anuncio no puede tener más de 3 fotos en total.");
      }

      setNewFiles(prev => [...prev, ...selectedFiles].slice(0, 3));
      
      const previews = selectedFiles.map(f => URL.createObjectURL(f));
      setNewPreviews(prev => [...prev, ...previews].slice(0, 3));
    }
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Validaciones RegEx
    // 1. Precio
    if (formData.tag === 'Compra/Venta' && formData.price) {
      if (!/^[\d., ]*(€|\$)?$/i.test(formData.price)) {
        return alert("El formato del precio no es válido.");
      }
    }

    // 2. Contacto Múltiple (validar solo los rellenos)
    const contacts = [];
    if (formData.contactEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) return alert("Email no válido.");
      contacts.push({ type: 'email', value: formData.contactEmail });
    }
    if (formData.contactPhone) {
      if (!/^(\+?\d{1,3}[- ]?)?\d{9,12}$/.test(formData.contactPhone.replace(/ /g, ''))) return alert("Teléfono no válido.");
      contacts.push({ type: 'phone', value: formData.contactPhone });
    }
    if (formData.contactInstagram) {
      if (!/^@?[\w.-]+$/.test(formData.contactInstagram) && !/^https?:\/\/(www\.)?instagram\.com\/[\w.-]+\/?$/.test(formData.contactInstagram)) return alert("Instagram no válido.");
      contacts.push({ type: 'instagram', value: formData.contactInstagram });
    }
    if (formData.contactOther) {
      contacts.push({ type: 'other', value: formData.contactOther });
    }

    setIsSubmitting(true);
    
    // 1. Subir nuevos archivos
    let uploadedUrls = [];
    if (newFiles.length > 0) {
      try {
        const uploadPromises = newFiles.map(f => uploadImage(f));
        uploadedUrls = await Promise.all(uploadPromises);
      } catch (err) {
        // err no usado, console.error(err)
        console.error("Error upload:", err);
        alert("Error al subir las nuevas imágenes.");
        setIsSubmitting(false);
        return;
      }
    }
    
    // 2. Combinar imágenes antiguas que no se borraron con las nuevas
    const finalImagesArray = [...existingImages, ...uploadedUrls];
    
    // Update db using secure RPC
    const { error } = await supabase.rpc('update_notice_with_token_v2', {
      p_token: token,
      p_title: formData.title,
      p_description: formData.description,
      p_tag: formData.tag,
      p_location: formData.location || null,
      p_price: formData.price || null,
      p_contacts: contacts,
      p_images: finalImagesArray
    });
      
    setIsSubmitting(false);
    
    if (error) {
      console.error(error);
      alert("Error actualizando anuncio.");
    } else {
      alert("¡Anuncio actualizado correctamente!");
      navigate('/');
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm("¿Seguro que quieres borrar este anuncio para siempre?")) return;
    
    setIsSubmitting(true);
    // Delete using secure RPC
    const { error } = await supabase.rpc('delete_notice_with_token', {
      p_token: token
    });
      
    if (error) {
      alert("Error al borrar el anuncio (comprueba tu token).");
      setIsSubmitting(false);
    } else {
      alert("Anuncio eliminado. Hasta nunca.");
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--neon-green)' }}>BUSCANDO ANUNCIO EN EL ABISMO...</h2>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--neon-green)' }}>
          EDICIÓN // {formData.title?.substring(0, 15)}...
        </h1>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          Volver al Tablón
        </button>
      </header>
      
      <main className="main-content" style={{ maxWidth: '800px' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--border-radius-md)' }}>
          <h2 style={{ marginBottom: '2rem', color: 'var(--neon-purple)' }}>MODIFICAR ANUNCIO</h2>
          
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>TITULAR</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-base" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>DESCRIPCIÓN</label>
              <textarea required rows="6" name="description" value={formData.description} onChange={handleChange} className="input-base" style={{ resize: 'vertical' }}></textarea>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>CATEGORÍA</label>
                <select name="tag" value={formData.tag} onChange={handleChange} className="input-base">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>UBICACIÓN</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-base" />
              </div>
            </div>

            {formData.tag === 'Compra/Venta' && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>PRECIO</label>
                <input type="text" name="price" value={formData.price} onChange={handleChange} className="input-base" />
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', paddingBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--neon-blue)', fontWeight: 'bold' }}>MEDIOS DE CONTACTO (Opcionales)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📧 Email</label>
                  <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="input-base" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📱 Teléfono</label>
                  <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="input-base" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📸 Instagram</label>
                  <input type="text" name="contactInstagram" value={formData.contactInstagram} onChange={handleChange} className="input-base" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>💬 Otro enlace/contacto</label>
                  <input type="text" name="contactOther" value={formData.contactOther} onChange={handleChange} className="input-base" />
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>FOTOS DEL ANUNCIO (Mínimo 0 - Máximo 3)</label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total: {existingImages.length + newFiles.length}/3
                </span>
              </div>
              
              <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', textAlign: 'center', borderRadius: 'var(--border-radius-sm)' }}>
                
                {/* Grid de imágenes existentes + nuevas previas */}
                {(existingImages.length > 0 || newPreviews.length > 0) ? (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: (existingImages.length + newFiles.length) < 3 ? '1.5rem' : '0' }}>
                    
                    {/* Imágenes antiguas de la DB */}
                    {existingImages.map((src, idx) => (
                      <div key={`exist-${idx}`} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={src} alt={`Guardada ${idx + 1}`} style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '4px', border: '2px solid rgba(255,255,255,0.1)' }} />
                        <button type="button" onClick={() => removeExistingImage(idx)} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--neon-pink)', color: '#000', borderRadius: '50%', padding: '4px', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Nuevos archivos por subir */}
                    {newPreviews.map((src, idx) => (
                      <div key={`new-${idx}`} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={src} alt={`Nueva ${idx + 1}`} style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '4px', border: '2px dashed var(--neon-green)' }} />
                        <button type="button" onClick={() => removeNewImage(idx)} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--neon-pink)', color: '#000', borderRadius: '50%', padding: '4px', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Botón de añadir si hay hueco */}
                {(existingImages.length + newFiles.length) < 3 && (
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={16} /> Subir Más Fotos
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                )}

              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
              <button type="button" onClick={handleDelete} className="btn" style={{ color: 'var(--neon-pink)', borderColor: 'var(--neon-pink)', backgroundColor: 'transparent' }} disabled={isSubmitting}>
                BORRAR DEFINITIVAMENTE
              </button>
              
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
