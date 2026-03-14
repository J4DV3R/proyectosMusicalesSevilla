import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, uploadImage } from '../lib/supabase';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

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
        setFormData({
          title: data.title,
          description: data.description,
          tag: data.tag,
          location: data.location || '',
          price: data.price || '',
          contact_type: data.contact_type,
          contact_value: data.contact_value,
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

    // 2. Contacto
    if (formData.contact_type === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_value)) {
        return alert("Introduce un correo válido.");
      }
    } else if (formData.contact_type === 'phone') {
      if (!/^(\+?\d{1,3}[- ]?)?\d{9,12}$/.test(formData.contact_value.replace(/ /g, ''))) {
        return alert("Introduce un teléfono válido.");
      }
    } else if (formData.contact_type === 'instagram') {
      if (!/^@?[\w.-]+$/.test(formData.contact_value) && !/^https?:\/\/(www\.)?instagram\.com\/[\w.-]+\/?$/.test(formData.contact_value)) {
        return alert("Introduce un Instagram válido.");
      }
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
    const { error } = await supabase.rpc('update_notice_with_token', {
      p_token: token,
      p_title: formData.title,
      p_description: formData.description,
      p_tag: formData.tag,
      p_location: formData.location || null,
      p_price: formData.price || null,
      p_contact_type: formData.contact_type,
      p_contact_value: formData.contact_value,
      p_images: finalImagesArray // Pasamos JSONB array directamente
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>CATEGORÍA</label>
                <select name="tag" value={formData.tag} onChange={handleChange} className="input-base">
                  <option value="Compra/Venta">Compra/Venta</option>
                  <option value="Conciertos">Conciertos</option>
                  <option value="Otros">Otros</option>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, auto) 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>CONTACTO TIPO</label>
                <select name="contact_type" value={formData.contact_type} onChange={handleChange} className="input-base">
                  <option value="email">Email</option>
                  <option value="phone">Teléfono</option>
                  <option value="instagram">Instagram</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>VALOR CONTACTO</label>
                <input required type="text" name="contact_value" value={formData.contact_value} onChange={handleChange} className="input-base" />
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
