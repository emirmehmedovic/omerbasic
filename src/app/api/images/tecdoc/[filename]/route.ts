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
    // TecDoc struktura prema dokumentaciji: Supplier ID / prva cifra / druga cifra / treća cifra / filename
    // Primjer: 190130.JPG -> /images/tecdoc/1/1/9/190130.JPG (Supplier ID = 1, prva cifra = 1, druga cifra = 1, treća cifra = 9)
    // Primjer: 477640.JPG -> /images/tecdoc/10/4/7/477640.JPG (Supplier ID = 10, prva cifra = 4, druga cifra = 7, treća cifra = 7)
    // 
    // Problem: Ne znamo Supplier ID iz filename-a, pa pokušavamo različite strukture
    const normalizedFilename = filename.toUpperCase();
    const possiblePaths: string[] = [];
    
    if (normalizedFilename.length >= 3) {
      const firstDigit = normalizedFilename[0];
      const secondDigit = normalizedFilename[1];
      const thirdDigit = normalizedFilename[2];
      
      // Struktura: 1/1/9/190130.JPG (bez Supplier ID-a, direktno prva/druga/treća cifra)
      // Ovo je najčešća struktura u našem slučaju
      possiblePaths.push(
        join(process.cwd(), 'public', 'images', 'tecdoc', firstDigit, secondDigit, thirdDigit, normalizedFilename)
      );
      
      // Struktura: 1/1/1/9/190130.JPG (Supplier ID = 1, prva cifra = 1, druga cifra = 1, treća cifra = 9)
      possiblePaths.push(
        join(process.cwd(), 'public', 'images', 'tecdoc', '1', firstDigit, secondDigit, thirdDigit, normalizedFilename)
      );
      
      // Struktura: 1/19/190130.JPG (Supplier ID = 1, prva 2 karaktera = 19)
      const firstTwoChars = normalizedFilename.substring(0, 2);
      possiblePaths.push(
        join(process.cwd(), 'public', 'images', 'tecdoc', '1', firstTwoChars, normalizedFilename)
      );
    }
    
    if (normalizedFilename.length >= 2) {
      const firstDigit = normalizedFilename[0];
      // Struktura: 1/190130.JPG
      possiblePaths.push(
        join(process.cwd(), 'public', 'images', 'tecdoc', firstDigit, normalizedFilename)
      );
    }
    
    // Direktno u tecdoc folderu
    possiblePaths.push(
      join(process.cwd(), 'public', 'images', 'tecdoc', normalizedFilename)
    );

    // Pronađi prvi postojeći fajl
    const filePath = possiblePaths.find(path => existsSync(path));

    // Check if file exists
    if (!filePath || !existsSync(filePath)) {
      console.error('TecDoc image not found:', {
        filename,
        normalizedFilename,
        triedPaths: possiblePaths,
      });
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

