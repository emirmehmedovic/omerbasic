import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'mime-types';

/**
 * API route za servisanje TecDoc slika iz public/images/tecdoc/
 * Koristi se za produkciju gdje Next.js ne može direktno servisati slike iz public foldera
 * nakon što je aplikacija buildovana.
 * 
 * Format putanje: /api/images/tecdoc/1/0/D/I/DIRKO_ANW.BMP
 * Mapira se na: public/images/tecdoc/1/0/D/I/DIRKO_ANW.BMP
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    // Rekonstruiši punu putanju od path segmenata
    const pathSegments = params.path;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: 'Missing path segments' },
        { status: 400 }
      );
    }

    // Kreiraj putanju do slike
    const imagePath = join(
      process.cwd(),
      'public',
      'images',
      'tecdoc',
      ...pathSegments
    );

    // Pročitaj fajl
    const imageBuffer = await readFile(imagePath);

    // Odredi MIME type na osnovu ekstenzije
    const filename = pathSegments[pathSegments.length - 1];
    const mimeType = lookup(filename) || 'application/octet-stream';

    // Vrati sliku sa odgovarajućim headerima
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[TECDOC_IMAGE_API_ERROR]', error);
    return NextResponse.json(
      { error: 'Image not found' },
      { status: 404 }
    );
  }
}

