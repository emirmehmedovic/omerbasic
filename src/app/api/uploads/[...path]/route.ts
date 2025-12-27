import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import mime from 'mime';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  
  // Reconstruct the file path from the URL segments
  const filePath = path.join('/');
  const absolutePath = join(process.cwd(), 'public', 'uploads', filePath);

  try {
    // Check if file exists
    await stat(absolutePath);
    
    // Read the file
    const fileBuffer = await readFile(absolutePath);
    
    // Determine content type
    const contentType = mime.getType(absolutePath) || 'application/octet-stream';
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    }
    console.error('Error serving upload:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
