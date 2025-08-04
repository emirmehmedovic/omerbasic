import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
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
      requestHeaders.set('x-nextauth-token', tokenString);
      console.log('[MIDDLEWARE] Postavljam x-nextauth-token header:', tokenString.substring(0, 50) + '...');
      
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
  
  // B2B redirect nakon prijave - preusmjeri B2B korisnike na products stranicu
  if (pathname === '/login' && token && token.role === 'B2B') {
    const url = req.nextUrl.clone();
    url.pathname = '/products';
    return NextResponse.redirect(url);
  }

  // Za sve ostale rute, dozvoli pristup
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/api/:path*'],
};
