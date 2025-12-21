import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ===== SECURITY & RATE LIMITING =====

  // 1. Request size validation (prevent DDoS via large payloads)
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10_000_000) { // 10MB limit
    return new NextResponse('Payload too large', { status: 413 });
  }

  // 2. Rate limiting for API routes
  if (pathname.startsWith('/api')) {
    const ip = getClientIp(req.headers);

    // Different limits for different types of requests
    let limit = 60; // Default: 60 requests per minute
    let windowMs = 60 * 1000; // 1 minute

    // Stricter limits for write operations
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
      limit = 20; // 20 writes per minute
    }

    // Even stricter for sensitive endpoints
    if (pathname.includes('/auth/') || pathname.includes('/admin/')) {
      limit = 10; // 10 requests per minute for auth/admin
    }

    // Apply rate limit
    const rateLimitKey = `api:${ip}:${pathname}`;
    const rateLimitResult = await rateLimit(rateLimitKey, limit, windowMs);

    if (!rateLimitResult.ok) {
      return new NextResponse('Too many requests. Please try again later.', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimitResult.resetInMs / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(Date.now() + rateLimitResult.resetInMs),
        },
      });
    }
  }
  
  // Dohvati token za sve rute (potrebno za B2B cijene u API rutama)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Za API rute, samo propusti zahtjev s tokenom (ne blokiraj pristup)
  if (pathname.startsWith('/api')) {
    console.log('[MIDDLEWARE] API ruta:', pathname);
    console.log('[MIDDLEWARE] Token:', token ? 'postoji' : 'ne postoji');
    
    // Dodaj token u headers za API rute kako bi bio dostupan u API rutama
    // Ovo je ključno za B2B cijene jer omogućava API rutama pristup sesiji
    if (token) {
      console.log('[MIDDLEWARE] Token role:', token.role);
      console.log('[MIDDLEWARE] Token discountPercentage:', token.discountPercentage);
      
      const requestHeaders = new Headers(req.headers);
      const tokenString = JSON.stringify(token);
      // Enkodiramo u Base64 jer HTTP headeri ne podržavaju Unicode karaktere
      const tokenBase64 = Buffer.from(tokenString).toString('base64');
      requestHeaders.set('x-nextauth-token', tokenBase64);
      console.log('[MIDDLEWARE] Postavljam x-nextauth-token header (base64)');
      
      // Vrati zahtjev s dodanim headerom koji sadrži token
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      // Dodaj token i u response headers za debugging
      response.headers.set('x-debug-token-set', 'true');
      
      return response;
    } else {
      console.log('[MIDDLEWARE] Nema tokena za API rutu');
    }
    
    // Ako nema tokena, samo propusti zahtjev bez modifikacije
    return NextResponse.next();
  }
  
  // Admin zaštita - samo za admin rute
  if (pathname.startsWith('/admin')) {
    // Ako nema tokena, preusmjeri na login
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Ako korisnik nema ADMIN ulogu, prikaži grešku
    if (token.role !== 'ADMIN') {
      return new NextResponse('Nemate dozvolu za pristup ovoj stranici.', { status: 403 });
    }
  }
  
  // B2B pravila pristupa
  if (token && token.role === 'B2B') {
    // Ako B2B korisnik ide na login, preusmjeri ga na proizvode
    if (pathname === '/login') {
      const url = req.nextUrl.clone();
      url.pathname = '/products';
      return NextResponse.redirect(url);
    }

    // Blokiraj samo naslovnu i kontakt stranicu za B2B; sve ostalo dozvoli (pretraga itd.)
    const isContact = pathname === '/contact' || pathname.startsWith('/contact/');
    if (pathname === '/' || isContact) {
      const url = req.nextUrl.clone();
      url.pathname = '/products';
      return NextResponse.redirect(url);
    }
  }

  // Za sve ostale rute, dozvoli pristup i dodaj security headers
  const response = NextResponse.next();

  // ===== SECURITY HEADERS =====
  // Add security headers to all responses
  addSecurityHeaders(response);

  return response;
}

// Helper function to add security headers to response
function addSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enable XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HTTPS only)
  // Only in production to avoid issues in local development
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Permissions Policy - restrict browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  // Pokreni middleware na svim stranicama (osim statičkih i image ruta) + API + admin + login
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/login',
    // Svi ostali page route-ovi (isključi _next/static, _next/image i favicon itd.)
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
