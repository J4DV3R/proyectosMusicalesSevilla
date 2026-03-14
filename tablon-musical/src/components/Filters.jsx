import React from 'react';

const tags = ['Compra/Venta', 'Conciertos', 'Otros'];

export default function Filters({ activeFilter, setActiveFilter }) {
  return (
    <section style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '2rem' }}>
      
      <button 
        className="btn" 
        onClick={() => setActiveFilter('Todos')}
        style={{ 
          backgroundColor: activeFilter === 'Todos' ? 'var(--accent-color)' : 'var(--surface-color)', 
          color: activeFilter === 'Todos' ? '#fff' : 'var(--text-primary)',
          border: activeFilter === 'Todos' ? '1px solid transparent' : '1px solid var(--border-color)'
        }}
      >
        Todos
      </button>

      {tags.map((tag) => {
        let activeBg, activeColor;
        if (tag === 'Compra/Venta') { activeBg = 'var(--tag-buy-sell)'; activeColor = '#fff'; }
        else if (tag === 'Conciertos') { activeBg = 'var(--tag-concert)'; activeColor = '#fff'; }
        else { activeBg = 'var(--tag-other)'; activeColor = '#fff'; }

        const isActive = activeFilter === tag;

        return (
          <button 
            key={tag}
            className="btn" 
            onClick={() => setActiveFilter(tag)}
            style={{ 
              backgroundColor: isActive ? activeBg : 'var(--surface-color)', 
              color: isActive ? activeColor : 'var(--text-primary)',
              border: isActive ? '1px solid transparent' : '1px solid var(--border-color)'
            }}
          >
            {tag}
          </button>
        )
      })}
    </section>
  );
}
