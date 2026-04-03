import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NoticeCard from '../components/NoticeCard';
import EditProfileModal from '../components/EditProfileModal';
import { ArrowLeft, Edit3, User, Instagram, Youtube, Twitter, Music, Link as LinkIcon, AlertTriangle } from 'lucide-react';

// Helpers para iconos de redes
const getSocialIcon = (type) => {
  switch (type.toLowerCase()) {
    case 'instagram': return <Instagram size={18} />;
    case 'youtube': return <Youtube size={18} />;
    case 'twitter': return <Twitter size={18} />;
    case 'spotify': return <Music size={18} color="#1DB954" />;
    case 'soundcloud': return <Music size={18} color="#ff7700" />;
    case 'bandcamp': return <Music size={18} color="#629aa9" />;
    default: return <LinkIcon size={18} />;
  }
};

const getSocialUrl = (type, value) => {
  if (value.startsWith('http')) return value;
  switch (type.toLowerCase()) {
    case 'instagram': return `https://instagram.com/${value.replace('@','')}`;
    case 'twitter': return `https://twitter.com/${value.replace('@','')}`;
    default: return `https://${value}`; // Fallback genérico
  }
};

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      setLoading(true);
      
      // 1. Verificar si el usuario que ve la página es el dueño
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.id === id) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError || !profileData) {
        setLoading(false);
        setErrorObj("No se encontró el perfil de usuario. Puede que sea una cuenta de sistema.");
        return;
      }
      
      if (profileData.is_admin && !isOwner) {
        setLoading(false);
        setErrorObj("No se puede consultar el perfil de una cuenta de administración.");
        return;
      }

      setProfile(profileData);

      // 3. Cargar Anuncios del usuario
      const { data: noticesData } = await supabase
        .from('notices')
        .select('id, title, description, tag, location, price, contact_type, contact_value, contacts, image_url, images, created_at, user_id')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (noticesData) {
        setNotices(noticesData);
      }
      
      setLoading(false);
    }

    fetchProfileData();
  }, [id]);

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--neon-green)' }}>CARGANDO PERFIL...</h2>
      </div>
    );
  }

  if (errorObj) {
    return (
      <div className="app-container" style={{ padding: '2rem' }}>
        <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: '2rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--neon-pink)', borderRadius: 'var(--border-radius-md)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem auto' }} />
          <h2>ERROR</h2>
          <p>{errorObj}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Header flotante mínimo */}
      <header className="glass-panel" style={{ padding: '1rem 2rem', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <ArrowLeft size={16} /> Volver
        </button>
      </header>

      <main className="main-content" style={{ maxWidth: '900px', margin: '0 auto', paddingTop: '2rem' }}>
        
        {/* CABECERA PERFIL */}
        <section className="glass-panel" style={{ padding: '3rem 2rem', borderRadius: 'var(--border-radius-md)', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
          
          {/* Adorno visual de fondo */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(57,255,20,0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '50%', color: 'var(--neon-green)', display: 'flex' }}>
                    <User size={32} />
                  </span>
                  {profile.username}
                </h1>
                
                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '1rem' }}>
                    {profile.tags.map(tag => (
                      <span key={tag} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', backgroundColor: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isOwner && (
                <button onClick={() => setIsEditModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} /> Editar Perfil
                </button>
              )}
            </div>

            {profile.bio && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '700px', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
                {profile.bio}
              </p>
            )}

            {/* Redes Sociales */}
            {profile.social_links && profile.social_links.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                {profile.social_links.map((link, idx) => (
                  <a key={idx} href={getSocialUrl(link.type, link.value)} target="_blank" rel="noopener noreferrer" 
                     className="btn" 
                     style={{ 
                       display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                       backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
                       fontSize: '0.85rem'
                     }}
                     onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--neon-blue)'; e.currentTarget.style.color = 'var(--neon-blue)'; }}
                     onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  >
                    {getSocialIcon(link.type)} {link.value.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* LISTADO DE ANUNCIOS */}
        <section>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.5rem', borderBottom: '2px solid var(--neon-purple)', paddingBottom: '0.5rem', display: 'inline-block' }}>
            PUBLICACIONES ({notices.length})
          </h2>
          
          {notices.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--border-radius-md)' }}>
              Este usuario todavía no ha publicado nada en el tablón.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {notices.map(notice => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          )}
        </section>

      </main>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userProfile={profile}
        onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
      />
    </div>
  );
}
