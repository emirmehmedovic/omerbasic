import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: any) {
  try {
    const slug = params?.slug;
    if (!slug) return notFoundResponse('Missing slug');

    const screen = await db.advertisingScreen.findUnique({ where: { slug } });
    if (!screen || !screen.isActive) return notFoundResponse('Screen not found or inactive');

    const escapedTitle = escapeHtml(screen.name || 'Ad Screen');
    const mediaUrl = screen.mediaUrl || '';

    const isYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(mediaUrl);

    function extractYouTubeId(url: string): string | null {
      try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) {
          return u.pathname.split('/').filter(Boolean)[0] || null;
        }
        if (u.searchParams.get('v')) return u.searchParams.get('v');
        // /embed/{id} or /shorts/{id}
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.findIndex(p => p === 'embed' || p === 'shorts');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
        return null;
      } catch {
        return null;
      }
    }

    function buildYouTubeEmbed(url: string): string | null {
      const id = extractYouTubeId(url);
      if (!id) return null;
      const embed = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${id}`;
      return `<iframe src="${attr(embed)}" title="${attr(escapedTitle)}" style="width:100%;height:100%;border:0;display:block;background:#000;" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="eager"></iframe>`;
    }

    const media = screen.mediaType === 'IMAGE'
      ? `<img src="${attr(mediaUrl)}" alt="${attr(escapedTitle)}" style="width:100%;height:100%;object-fit:cover;background:#000;display:block;" />`
      : (isYouTube ? (buildYouTubeEmbed(mediaUrl) || '') : `<video src="${attr(mediaUrl)}" style="width:100%;height:100%;object-fit:cover;background:#000;display:block;" autoplay muted loop playsinline></video>`);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta http-equiv="refresh" content="3600" />
    <title>${escapedTitle}</title>
    <style>
      html,body{margin:0;padding:0;background:#000;color:#fff;height:100%;}
      body{min-height:100vh;display:flex;align-items:center;justify-content:center;}
      .canvas{width:100vw;height:100vh;background:#000;overflow:hidden;}
      .wrap{box-sizing:border-box;padding:24px;width:100%;height:100%;display:flex;flex-direction:column;gap:0;}
      /* Flex fallback for older TV browsers; upgraded to grid if supported */
      .hero{display:flex;height:120px;margin:0;flex-wrap:nowrap;align-items:stretch;}
      .hero> .card{min-width:0;}
      .hero> .card:nth-child(1){width:20%;flex:0 0 20%;}
      .hero> .card:nth-child(2){width:40%;flex:0 0 40%;}
      .hero> .card:nth-child(3){width:40%;flex:0 0 40%;}
      .hero> .card + .card{margin-left:20px;}
      .hero-overlay .hero{height:100%;margin:0;}
      @supports (display: grid){
        .hero{display:grid;grid-template-columns:1fr 2fr 2fr;gap:20px;height:120px;margin-bottom:16px;}
        .hero> .card{margin:0;width:auto;}
        .hero> .card + .card{margin-left:0;}
        .hero-overlay .hero{height:100%;margin:0;}
      }
      .card{position:relative;border-radius:16px;background:rgba(255,255,255,0.06);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35);min-width:0;} /* subtle inner highlight */
      .card.glass{background:rgba(255,255,255,0.22);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);} /* stronger frost */
      .card-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:16px;}
      .logo{max-width:85%;max-height:85%;display:block;margin:auto;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.5));}
      .accent{background:rgba(240,178,122,0.18);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);} /* stronger warm frost */
      .blue{background:rgba(102,126,234,0.18);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);} /* stronger blue frost */
      .card-title{font-family:system-ui,Arial,sans-serif;color:#fff;font-weight:800;font-size:34px;line-height:1.15;text-align:center;text-shadow:0 3px 10px rgba(0,0,0,0.6);letter-spacing:0.2px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;}
      .title-chip{display:inline-block;background:transparent;padding:0;border-radius:0;}      
      .content{flex:1;border-radius:20px;overflow:hidden;box-shadow:0 20px 45px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset;background:rgba(20,20,20,0.9);display:flex;flex-direction:column;position:relative;}
      .media{flex:1;width:100%;background:#000;position:relative;}
      /* Make iframe cover like background */
      .media iframe{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100vw;height:56.25vw;min-height:100vh;min-width:177.78vh;border:0;}
      .hero-overlay{position:absolute;inset:0 auto auto 0;top:0;left:0;right:0;height:120px;padding:12px 18px 0;z-index:2;}
      /* This secondary .hero kept for clarity; properties adjusted by rules above */
      .hero{height:100%;margin:0;}
      /* Fallback scaling for smaller screens while preserving 16:9 */
      @media (max-width:1920px){ .canvas{ width:100vw; height:calc(100vw * 1080 / 1920); } }
      @media (max-height:1080px){ .canvas{ height:100vh; width:calc(100vh * 1920 / 1080); } }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="wrap">
        <div class="content">
          <div class="media">${media}</div>
          <div class="hero-overlay" style="position:absolute;top:0;left:0;right:0;height:120px;padding:12px 18px 0;z-index:2;">
            <div class="hero" style="display:flex;height:100%;">
              <div class="card glass" style="position:relative;border-radius:16px;background:rgba(255,255,255,0.22);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);min-width:0;flex:0 0 20%;">
                <div class="card-inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:16px;">
                  <img src="/images/omerbasic.png" alt="Logo" class="logo" style="max-width:85%;max-height:85%;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.5));display:block;margin:auto;"/>
                </div>
              </div>
              <div class="card accent" style="position:relative;border-radius:16px;background:rgba(240,178,122,0.18);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);min-width:0;flex:0 0 40%;margin-left:20px;">
                <div class="card-inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:16px;">
                  <div class="card-title" style="font-family:system-ui,Arial,sans-serif;color:#fff;font-weight:800;font-size:34px;line-height:1.15;text-align:center;text-shadow:0 3px 10px rgba(0,0,0,0.6);letter-spacing:0.2px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">
                    <span class="title-chip" style="display:inline-block;">Od Jelaha do cijele BiH – pouzdani dijelovi za svaki teren</span>
                  </div>
                </div>
              </div>
              <div class="card blue" style="position:relative;border-radius:16px;background:rgba(102,126,234,0.18);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 25px rgba(0,0,0,0.35);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);min-width:0;flex:0 0 40%;margin-left:20px;">
                <div class="card-inner" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:16px;">
                  <div class="card-title" style="font-family:system-ui,Arial,sans-serif;color:#fff;font-weight:800;font-size:34px;line-height:1.15;text-align:center;text-shadow:0 3px 10px rgba(0,0,0,0.6);letter-spacing:0.2px;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">
                    <span class="title-chip" style="display:inline-block;">Brzo, jednostavno, dostupno – potraži odmah!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (_e) {
    return new Response('<!doctype html><html><body style="background:#000;color:#fff;font-family:system-ui,Arial,sans-serif;padding:16px;">Greška pri učitavanju.</body></html>', {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}

function notFoundResponse(message: string) {
  const html = `<!doctype html><html><body style="background:#000;color:#fff;font-family:system-ui,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">${escapeHtml(message)}</body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function escapeHtml(v: string) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attr(v: string) {
  // Very basic attribute escaping
  return escapeHtml(v);
}
