import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import mime from 'mime';

// Enable ISR-style caching for this route
export const revalidate = 3600; // Cache for 1 hour

// In-memory cache for resolved file paths to avoid repeated filesystem lookups
// Map: filename -> absolute file path
const pathCache = new Map<string, string | null>();
const CACHE_SIZE_LIMIT = 1000; // Prevent memory overflow

function findTecDocImagePath(filename: string): string | null {
  // Check cache first
  if (pathCache.has(filename)) {
    return pathCache.get(filename) || null;
  }

  // TecDoc struktura: pokušaj različite putanje
  const normalizedFilename = filename.toUpperCase();
  const possiblePaths: string[] = [];

  if (normalizedFilename.length >= 3) {
    const firstDigit = normalizedFilename[0];
    const secondDigit = normalizedFilename[1];
    const thirdDigit = normalizedFilename[2];

    // Najčešća struktura: 1/1/9/190130.JPG
    possiblePaths.push(
      join(process.cwd(), 'public', 'images', 'tecdoc', firstDigit, secondDigit, thirdDigit, normalizedFilename)
    );

    // Struktura sa Supplier ID: 1/1/1/9/190130.JPG
    possiblePaths.push(
      join(process.cwd(), 'public', 'images', 'tecdoc', '1', firstDigit, secondDigit, thirdDigit, normalizedFilename)
    );

    // Struktura: 1/19/190130.JPG
    const firstTwoChars = normalizedFilename.substring(0, 2);
    possiblePaths.push(
      join(process.cwd(), 'public', 'images', 'tecdoc', '1', firstTwoChars, normalizedFilename)
    );
  }

  if (normalizedFilename.length >= 2) {
    const firstDigit = normalizedFilename[0];
    possiblePaths.push(
      join(process.cwd(), 'public', 'images', 'tecdoc', firstDigit, normalizedFilename)
    );
  }

  // Direktno u tecdoc folderu
  possiblePaths.push(
    join(process.cwd(), 'public', 'images', 'tecdoc', normalizedFilename)
  );

  // Pronađi prvi postojeći fajl
  const filePath = possiblePaths.find(path => existsSync(path)) || null;

  // Cache result (even if null to avoid repeated lookups for missing files)
  if (pathCache.size < CACHE_SIZE_LIMIT) {
    pathCache.set(filename, filePath);
  }

  return filePath;
}

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

    // Find file path using cached lookup
    const filePath = findTecDocImagePath(filename);

    if (!filePath) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = mime.getType(filePath) || 'application/octet-stream';

    // Return file with aggressive caching (images never change)
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

