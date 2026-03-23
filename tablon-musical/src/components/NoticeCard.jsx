import React, { useState } from 'react';
import { Mail, Phone, Instagram } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';

export default function NoticeCard({ notice }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { title, description, tag, image_url, images, contact_type, contact_value, created_at, location, price, contacts } = notice;
  
  const { categories } = useCategories();
  
  // Buscar en la BD; si se eliminó, dar un fallback
  const catObj = categories.find(c => c.name === tag);
  const config = catObj ? { color: catObj.color, bg: catObj.bg_color } : { color: 'var(--neon-pink)', bg: 'rgba(255, 42, 109, 0.1)' };

  // Helper: añadir € solo si el usuario no lo incluyó ya
  const formatPrice = (p) => p && !p.includes('€') ? `${p} €` : p;

  
  // Compatibilidad: usar nuevo array images, si no existe o es nulo, usar image_url antigua
  const displayImages = (images !== null && images !== undefined) ? images : (image_url ? [image_url] : []);

  // Normalizar los contactos (por si vienen del sistema antiguo o el nuevo array jsonb)
  let activeContacts = [];
  if (contacts && Array.isArray(contacts) && contacts.length > 0) {
    activeContacts = contacts;
  } else if (contact_value) {
    activeContacts = [{ type: contact_type || 'other', value: contact_value }];
  }

  const hasContacts = activeContacts.length > 0;

  const renderContactIcon = (type, props = {}) => {
    switch (type) {
      case 'email': return <Mail {...props} />;
      case 'phone': return <Phone {...props} />;
      case 'instagram': return <Instagram {...props} />;
      default: return <span style={{ fontSize: props.size ? `${props.size}px` : '16px' }}>💬</span>;
    }
  };

  const renderContactValue = (c) => {
    if (!c.value) return null;
    let href = "#";
    let displayValue = c.value;
    
    if (c.type === 'email') {
      href = `mailto:${c.value}`;
    } else if (c.type === 'phone') {
      href = `tel:${c.value.replace(/ /g, '')}`;
    } else if (c.type === 'instagram') {
      if (c.value.startsWith('http')) {
        href = c.value;
        try {
          const urlObj = new URL(c.value);
          displayValue = `@${urlObj.pathname.replace(/\\//g, '')}`;
        } catch { displayValue = 'Instagram Link'; }
      } else {
        const username = c.value.replace('@', '');
        href = `https://instagram.com/${username}`;
        displayValue = `@${username}`;
      }
    }
    
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--neon-blue)', wordBreak: 'break-all', textDecoration: 'none', fontWeight: 600 }}>
        {displayValue}
      </a>
    );
  };

  return (
    <>
      {/* Vista de Tarjeta Normal */}
      <div 
        className="glass-panel" 
        onClick={() => setIsExpanded(true)}
        style={{ position: 'relative', borderRadius: 'var(--border-radius-md)', padding: '1.5rem', transition: 'transform var(--transition-fast)', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}
      >
        {/* Indicador visual de clic */}
        <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', opacity: 0.8, pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>VER MÁS</span>
        </div>
      
      {/* Image (Optional) - Puesto al principio para que el margin negativo encaje con los bordes */}
      {displayImages.length > 0 && (
        <div style={{ margin: '-1.5rem -1.5rem 1.5rem -1.5rem', borderBottom: '1px solid var(--border-color)', height: '200px', overflow: 'hidden', borderTopLeftRadius: 'var(--border-radius-md)', borderTopRightRadius: 'var(--border-radius-md)', position: 'relative' }}>
          <img src={displayImages[0]} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {displayImages.length > 1 && (
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              1 / {displayImages.length} 📸
            </div>
          )}
        </div>
      )}

      {/* Header (Tag & Date) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: config.bg, color: config.color }}>
          {tag}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {new Date(created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Content Colapsado */}
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1, whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {description}
      </p>

      {/* Additional info (location/price) */}
      {(location || price) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {location && <span style={{ color: 'var(--text-secondary)' }}>📍 {location}</span>}
          {price && <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatPrice(price)}</span>}
        </div>
      )}

      {/* Contact Footer Solo Si Hay Contactos */}
      {hasContacts && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '4px' }}>
            {activeContacts.map((c, i) => (
              <span key={i}>{renderContactIcon(c.type, { size: 16 })}</span>
            ))}
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ver contacto...</span>
        </div>
      )}

    </div>

    {/* MODAL EXPANDIDO */}
    {isExpanded && (
      <div className="modal-container" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setIsExpanded(false)}>
        
        {/* Evitamos que el clic dentro del modal lo cierre */}
        <div 
          className="glass-panel modal-content" 
          onClick={(e) => e.stopPropagation()} 
          style={{ width: '100%', maxWidth: '700px', borderRadius: 'var(--border-radius-md)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'fadeIn 0.2s ease' }}
        >
          {/* Botón cerrar flotante */}
          <button onClick={() => setIsExpanded(false)} className="btn btn-secondary" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, padding: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none' }}>
            <span style={{ fontSize: '1.2rem' }}>✖</span>
          </button>

          {/* Imagen completa (Carrusel) si existe */}
          {displayImages.length > 0 && (
            <div style={{ width: '100%', height: '400px', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <img src={displayImages[currentImageIndex]} alt={`${title} - foto ${currentImageIndex + 1}`} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
              
              {/* Controles de Carrusel */}
              {displayImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1)); }}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ❮
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1)); }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ❯
                  </button>
                  <div style={{ position: 'absolute', bottom: '15px', display: 'flex', gap: '8px' }}>
                    {displayImages.map((_, idx) => (
                      <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentImageIndex === idx ? 'var(--neon-green)' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ padding: '2rem' }}>
            {/* Header tags expandido */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: config.bg, color: config.color }}>
                {tag}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {new Date(created_at).toLocaleDateString()}
              </span>
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h2>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
              {description}
            </p>

            {/* Additional info (location/price) */}
            {(location || price) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--surface-color)', borderRadius: '8px' }}>
                {location && <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>UBICACIÓN</span>📍 {location}</div>}
                {price && <div><span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>PRECIO</span><strong style={{ color: 'var(--neon-green)', fontSize: '1.1rem' }}>{formatPrice(price)}</strong></div>}
              </div>
            )}

            {/* Contact Footer Interactivo Funcional */}
            {hasContacts && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>INFORMACIÓN DE CONTACTO</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeContacts.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                      <div style={{ color: 'var(--neon-blue)', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                        {renderContactIcon(c.type, { size: 20 })}
                      </div>
                      <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        {renderContactValue(c)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    )}
    </>
  );
}
