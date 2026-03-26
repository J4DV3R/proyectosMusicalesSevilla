import React from 'react';

export default function HomePage({ onGoToAds }) {
  return (
    <div style={{ animation: 'fadeIn 0.6s ease' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', margin: '3rem 0 4rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎸</div>
        <h2 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          marginBottom: '1.25rem',
          color: 'var(--text-primary)',
          textShadow: '4px 4px 0 var(--accent-color)',
          lineHeight: 1.1
        }}>
          ESCENA MUSICAL<br />SEVILLA
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.05rem',
          maxWidth: '560px',
          margin: '0 auto 2rem',
          letterSpacing: '0.05em',
          lineHeight: 1.6
        }}>
          El tablón de anuncios hecho por y para los artistas de la escena sevillana.
          Buscas banda, vendes instrumento, organizas concierto — aquí se anuncia todo.
        </p>
        <button
          onClick={onGoToAds}
          className="btn btn-primary"
          style={{ fontSize: '0.95rem', padding: '12px 32px' }}
        >
          Ver Anuncios →
        </button>
      </section>

      {/* Info Cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {[
          {
            icon: '📢',
            title: '¿CÓMO FUNCIONA?',
            color: 'var(--neon-green)',
            text: 'Publica un anuncio gratis en segundos. Sin registro ni contraseñas: recibirás un enlace secreto para editar o borrar tu anuncio cuando quieras.'
          },
          {
            icon: '🔒',
            title: 'SIN REGISTRO',
            color: 'var(--neon-blue)',
            text: 'No guardamos datos personales. Solo lo que tú decides publicar. Guarda tu enlace de edición en un lugar seguro.'
          },
          {
            icon: '⏳',
            title: 'VIDA ÚTIL',
            color: 'var(--neon-pink)',
            text: 'Los anuncios se archivan a los 14 días y se borran definitivamente a los 30. Así la escena se mantiene fresca y activa.'
          }
        ].map(card => (
          <div key={card.title} className="glass-panel" style={{
            padding: '1.75rem',
            borderRadius: 'var(--border-radius-md)',
            borderTop: `3px solid ${card.color}`
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{card.icon}</div>
            <h3 style={{ fontSize: '0.95rem', color: card.color, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              {card.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {card.text}
            </p>
          </div>
        ))}
      </section>

      {/* CTA bottom */}
      <section className="glass-panel" style={{
        padding: '2.5rem',
        borderRadius: 'var(--border-radius-md)',
        textAlign: 'center',
        marginBottom: '2rem',
        borderLeft: '4px solid var(--neon-green)'
      }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
          ¿TIENES ALGO QUE ANUNCIAR?
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Busco banda · Vendo instrumento · Organizo concierto · Ofrezco clases…
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          Usa el botón <strong style={{ color: 'var(--accent-color)' }}>PUBLICAR</strong> de la barra superior en cualquier momento.
        </p>
      </section>
    </div>
  );
}
