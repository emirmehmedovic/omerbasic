import type { Metadata } from 'next';
import { db } from '@/lib/db';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Reklamni ekran | TP Omerbašić',
  robots: {
    index: false,
    follow: false,
  },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdScreenPage({ params }: Props) {
  const { slug } = await params;
  const screen = await db.advertisingScreen.findUnique({ where: { slug } });

  if (!screen || !screen.isActive) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center">
        <div>Screen not found or inactive.</div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
        <div style={{ boxSizing: 'border-box', padding: 24, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 45px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset', background: 'rgba(20,20,20,0.9)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ flex: 1, width: '100%', background: '#000', overflow: 'hidden', position: 'relative' }}>
              {screen.mediaType === 'IMAGE' ? (
                <img
                  src={screen.mediaUrl}
                  alt={screen.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
                />
              ) : (() => {
                const url = screen.mediaUrl || '';
                const isYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(url);
                const extractYouTubeId = (u: string): string | null => {
                  try {
                    const parsed = new URL(u);
                    if (parsed.hostname.includes('youtu.be')) {
                      return parsed.pathname.split('/').filter(Boolean)[0] || null;
                    }
                    if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
                    const parts = parsed.pathname.split('/').filter(Boolean);
                    const idx = parts.findIndex(p => p === 'embed' || p === 'shorts');
                    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
                    return null;
                  } catch {
                    return null;
                  }
                };
                if (isYouTube) {
                  const id = extractYouTubeId(url);
                  const embed = id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${id}` : '';
                  return (
                    <iframe
                      src={embed}
                      title={screen.name || 'Ad Video'}
                      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100vw', height: '56.25vw', minHeight: '100vh', minWidth: '177.78vh', border: 0, display: 'block', background: '#000' }}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="eager"
                    />
                  );
                }
                return (
                  <video
                    src={screen.mediaUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                  />
                );
              })()}
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, padding: '12px 18px 0', zIndex: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 20, height: '100%' }}>
                <div style={{ position: 'relative', borderRadius: 16, background: 'rgba(255,255,255,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' as any, minWidth: 0 }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <img src="/images/omerbasic.png" alt="Logo" style={{ maxWidth: '85%', maxHeight: '85%', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }} />
                  </div>
                </div>
                <div style={{ position: 'relative', borderRadius: 16, background: 'rgba(240,178,122,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' as any, minWidth: 0 }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ fontFamily: 'system-ui,Arial,sans-serif', color: '#fff', fontWeight: 800, fontSize: 34, lineHeight: 1.15, textAlign: 'center', textShadow: '0 3px 10px rgba(0,0,0,0.6)', letterSpacing: 0.2, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <span style={{ display: 'inline-block' }}>Od Jelaha do cijele BiH – pouzdani dijelovi za svaki teren</span>
                    </div>
                  </div>
                </div>
                <div style={{ position: 'relative', borderRadius: 16, background: 'rgba(102,126,234,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' as any, minWidth: 0 }}>
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ fontFamily: 'system-ui,Arial,sans-serif', color: '#fff', fontWeight: 800, fontSize: 34, lineHeight: 1.15, textAlign: 'center', textShadow: '0 3px 10px rgba(0,0,0,0.6)', letterSpacing: 0.2, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <span style={{ display: 'inline-block' }}>Brzo, jednostavno, dostupno – potraži odmah!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
