import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Bug, Lightbulb, MessageSquare, CheckCircle } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'Error',      label: 'Reportar Error / Bug',   icon: Bug,           color: 'var(--neon-pink)',   bg: 'rgba(255,20,147,0.08)' },
  { id: 'Sugerencia', label: 'Sugerencia de Mejora',   icon: Lightbulb,     color: 'var(--neon-green)',  bg: 'rgba(57,255,20,0.08)' },
  { id: 'Otro',       label: 'Otro Comentario',         icon: MessageSquare, color: 'var(--neon-blue)',   bg: 'rgba(0,200,255,0.08)' },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) return alert('Por favor, selecciona un tipo.');
    if (!description.trim()) return alert('Por favor, describe el problema o sugerencia.');

    setIsSubmitting(true);
    const { error } = await supabase.from('reports').insert([{
      type: selectedType,
      description: description.trim(),
      contact: contact.trim() || null,
    }]);
    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert('Error al enviar. Inténtalo de nuevo.');
    } else {
      setSuccess(true);
    }
  };

  const handleReset = () => {
    setSelectedType('');
    setDescription('');
    setContact('');
    setSuccess(false);
  };

  if (success) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', animation: 'fadeIn 0.4s ease', padding: '0 1rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--neon-green)' }}>
          <CheckCircle size={60} color="var(--neon-green)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--neon-green)' }}>¡RECIBIDO!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Gracias por tomarte el tiempo de enviarlo. Lo revisaremos pronto y lo tendremos en cuenta para mejorar la plataforma.
          </p>
          <button onClick={handleReset} className="btn btn-primary" style={{ width: '100%' }}>
            Enviar otro mensaje
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem', animation: 'fadeIn 0.5s ease' }}>

      {/* Cabecera */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)', textShadow: '3px 3px 0 var(--accent-color)' }}>
          CONTACTO &amp; SUGERENCIAS
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto', letterSpacing: '0.04em', lineHeight: 1.6 }}>
          ¿Encontraste un error? ¿Tienes alguna idea para mejorar el tablón? Cuéntanoslo y lo revisaremos.
        </p>
      </section>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--border-radius-md)' }}>

        {/* Selector de tipo */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tipo de mensaje *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
            {REPORT_TYPES.map(({ id, label, icon: Icon, color, bg }) => {
              const isSelected = selectedType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedType(id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '1.1rem 0.75rem',
                    borderRadius: 'var(--border-radius-sm)',
                    border: `2px solid ${isSelected ? color : 'var(--border-color)'}`,
                    background: isSelected ? bg : 'rgba(255,255,255,0.02)',
                    color: isSelected ? color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 400,
                    textAlign: 'center',
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <Icon size={22} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Descripción *
            </label>
            <textarea
              required
              rows="5"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-base"
              placeholder={
                selectedType === 'Error'
                  ? 'Describe qué ha fallado, cuándo ocurrió y qué estabas intentando hacer...'
                  : selectedType === 'Sugerencia'
                  ? 'Comparte tu idea para mejorar la plataforma...'
                  : 'Escribe aquí tu mensaje...'
              }
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Contacto opcional */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Contacto (Opcional)
            </label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              className="input-base"
              placeholder="Email, Instagram o teléfono para que podamos responderte"
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
              Solo se usará para responderte si es necesario. Completamente opcional.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !selectedType}
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Send size={16} />
            {isSubmitting ? 'ENVIANDO...' : 'ENVIAR MENSAJE'}
          </button>

        </form>
      </div>
    </div>
  );
}
