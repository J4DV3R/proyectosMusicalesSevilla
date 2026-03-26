import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';

export default function CreateNoticeModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tag: '', // Se asignará la primera categoría disponible por defecto luego
    location: '',
    price: '',
    contactEmail: '',
    contactPhone: '',
    contactInstagram: '',
    contactOther: ''
  });
  
  const { categories } = useCategories();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToken, setSuccessToken] = useState(null);
  const [copied, setCopied] = useState(false);

  // Asegurar que si abre y no tiene tag y hay categorias cargadas se asigne la primera
  React.useEffect(() => {
    if (isOpen && categories.length > 0 && !formData.tag) {
      setFormData(prev => ({ ...prev, tag: categories[0].name }));
    }
  }, [isOpen, categories, formData.tag]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      if (files.length + selectedFiles.length > 3) {
        return alert("Solo puedes subir un máximo de 3 fotos.");
      }

      setFiles(prev => [...prev, ...selectedFiles].slice(0, 3));
      
      const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
      setPreviews(prev => [...prev, ...newPreviews].slice(0, 3));
    }
  };

  const removeImage = (indexToRemove) => {
    setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones RegEx
    // 1. Precio (si es Compra/Venta) - Permite números y formato opcional decimal/divisa ej: 15.50, 20 €
    if (formData.tag === 'Compra/Venta' && formData.price) {
      if (!/^(?:€\s*)?[\d., ]*(?:\s*€)?$/i.test(formData.price)) {
        return alert("El formato del precio no es válido. Usa números (ej. '150', '20.50 €', '€ 150').");
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
    
    try {
      const dataToSubmit = { ...formData, contacts };
      delete dataToSubmit.contactEmail;
      delete dataToSubmit.contactPhone;
      delete dataToSubmit.contactInstagram;
      delete dataToSubmit.contactOther;

      const result = await onSubmit(dataToSubmit, files);
      if (result && result.edit_token) {
        setSuccessToken(result.edit_token);
      } else {
        closeAndReset();
      }
    } catch (error) {
      console.error(error);
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        alert("Has subido demasiados anuncios, por favor espera un rato (10 min) para proteger la web contra el SPAM.");
      } else {
        alert("Hubo un problema al publicar. Por favor, inténtalo de nuevo o comprueba que el servidor esté activo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setFormData({
      title: '', description: '', tag: categories.length > 0 ? categories[0].name : '', location: '', price: '', 
      contactEmail: '', contactPhone: '', contactInstagram: '', contactOther: ''
    });
    setFiles([]);
    setPreviews([]);
    setSuccessToken(null);
    setCopied(false);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/edit/${successToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (successToken) {
    return (
      <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}>
        <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: '500px', borderRadius: 'var(--border-radius-md)', padding: '2.5rem', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤘</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--neon-green)' }}>¡ANUNCIO PUBLICADO!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            Tu anuncio ya está visible. Puedes editarlo o borrarlo en cualquier momento desde el <strong>icono de marcador</strong> (🔖) en la barra superior.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            Si borras los datos del navegador o cambias de dispositivo, usa este <strong>enlace secreto de respaldo</strong>:
          </p>
          
          <div style={{ backgroundColor: '#000', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--neon-purple)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {window.location.origin}/edit/{successToken}
            </span>
            <button type="button" onClick={handleCopy} className="btn" style={{ padding: '8px', minWidth: '40px', display: 'flex', justifyContent: 'center', background: 'var(--surface-color)', borderColor: copied ? 'var(--neon-green)' : 'var(--border-color)' }}>
              {copied ? <Check size={18} color="var(--neon-green)" /> : <Copy size={18} color="var(--text-secondary)" />}
            </button>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2rem', fontStyle: 'italic' }}>
            💡 Este enlace es solo un respaldo. Normalmente podrás editar tu anuncio desde el icono 🔖 sin necesidad de este enlace.
          </p>

          <button onClick={closeAndReset} className="btn btn-primary" style={{ width: '100%' }}>
            ENTENDIDO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
      
      <div className="glass-panel modal-content" style={{ width: '100%', maxWidth: '600px', borderRadius: 'var(--border-radius-md)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Publicar Nuevo Anuncio</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Título *</label>
            <input required type="text" name="title" value={formData.title} onChange={handleChange} className="input-base" placeholder="Ej. Busco bajista para banda de rock" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Descripción *</label>
            <textarea required rows="4" name="description" value={formData.description} onChange={handleChange} className="input-base" placeholder="Detalles de tu anuncio..." style={{ resize: 'vertical' }}></textarea>
          </div>

          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Categoría *</label>
              <select name="tag" value={formData.tag} onChange={handleChange} className="input-base">
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ubicación (Opcional)</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="input-base" placeholder="Ej. Madrid, Centro" />
            </div>
          </div>

          {formData.tag === 'Compra/Venta' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Precio (Opcional)</label>
              <input type="text" name="price" value={formData.price} onChange={handleChange} className="input-base" placeholder="Ej. 150 €" />
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--neon-blue)', fontWeight: 'bold' }}>Medios de Contacto (Opcionales, rellena los que quieras)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📧 Email</label>
                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="input-base" placeholder="tucorreo@ejemplo.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📱 Teléfono</label>
                <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="input-base" placeholder="+34 600000000" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📸 Instagram</label>
                <input type="text" name="contactInstagram" value={formData.contactInstagram} onChange={handleChange} className="input-base" placeholder="@usuario o URL" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>💬 Otro enlace/contacto</label>
                <input type="text" name="contactOther" value={formData.contactOther} onChange={handleChange} className="input-base" placeholder="Cualquier otra forma..." />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Imágenes Adjuntas (Mínimo 0 - Máximo 3)</label>
            <div style={{ padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', backgroundColor: 'var(--surface-color)' }}>
              
              {previews.length > 0 ? (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: previews.length < 3 ? '1.5rem' : '0' }}>
                  {previews.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={src} alt={`Preview ${idx + 1}`} style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--neon-pink)', color: '#000', borderRadius: '50%', padding: '4px', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {previews.length < 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  {previews.length === 0 && <ImageIcon size={32} />}
                  <p style={{ fontSize: '0.9rem', display: previews.length === 0 ? 'block' : 'none' }}>Haz clic o arrastra imágenes aquí</p>
                  <label className="btn btn-secondary" style={{ marginTop: previews.length === 0 ? '0.5rem' : '0', cursor: 'pointer' }}>
                    <Upload size={16} /> Seleccionar Archivos {previews.length > 0 && `(${previews.length}/3)`}
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button type="button" onClick={closeAndReset} className="btn btn-secondary" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR ANUNCIO'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
