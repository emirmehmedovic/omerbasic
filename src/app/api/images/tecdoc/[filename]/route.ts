import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import mime from 'mime';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    // Rekonstruiraj putanju iz filename-a
    // Primjer: 477640.JPG -> /images/tecdoc/10/4/7/477640.JPG
    // Format: prva 3 cifre su folder struktura
    const normalizedFilename = filename.toUpperCase();
    let filePath: string;
    
    if (normalizedFilename.length >= 6) {
      // Ekstraktuj prve 3 cifre za folder strukturu
      const firstDigit = normalizedFilename[0];
      const secondDigit = normalizedFilename[1];
      const thirdDigit = normalizedFilename[2];
      
      filePath = join(process.cwd(), 'public', 'images', 'tecdoc', firstDigit, secondDigit, thirdDigit, normalizedFilename);
    } else {
      // Fallback: pokušaj direktno u tecdoc folderu
      filePath = join(process.cwd(), 'public', 'images', 'tecdoc', normalizedFilename);
    }

    // Ako ne postoji na prvoj lokaciji, pokušaj direktno u tecdoc folderu
    if (!existsSync(filePath)) {
      filePath = join(process.cwd(), 'public', 'images', 'tecdoc', normalizedFilename);
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    const contentType = mime.getType(filePath) || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving tecdoc image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

