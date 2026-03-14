import React from 'react';
import { useCategories } from '../context/CategoryContext';

export default function Filters({ activeFilter, setActiveFilter }) {
  const { categories } = useCategories();
  // El filtro 'Todos' siempre estará fijo al principio
  
  return (
    <section style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '2rem' }}>
      {/* Botón estático Todos */}
      <button
        onClick={() => setActiveFilter('Todos')}
        style={{
          padding: '8px 20px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          backgroundColor: activeFilter === 'Todos' ? 'var(--accent-color)' : 'transparent',
          color: activeFilter === 'Todos' ? '#000' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all var(--transition-fast)'
        }}
      >
        Todos
      </button>

      {/* Botones Dinámicos desde BBDD */}
      {categories.map(c => (
        <button
          key={c.id}
          onClick={() => setActiveFilter(c.name)}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: activeFilter === c.name ? `1px solid ${c.color}` : '1px solid var(--border-color)',
            backgroundColor: activeFilter === c.name ? c.bg_color : 'transparent',
            color: activeFilter === c.name ? c.color : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all var(--transition-fast)'
          }}
        >
          {c.name}
        </button>
      ))}
    </section>
  );
}
