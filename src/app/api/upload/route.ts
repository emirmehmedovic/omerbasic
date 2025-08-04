import { writeFile, stat, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import mime from 'mime';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
  }

  // Basic validation for image type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Create a unique filename
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const extension = mime.getExtension(file.type);
  const filename = `${uniqueSuffix}.${extension || 'jpg'}`;

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'products');

  // Ensure upload directory exists
  try {
    await stat(uploadDir);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      await mkdir(uploadDir, { recursive: true });
    } else {
      console.error('Error checking directory:', e);
      return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
  }

  try {
    await writeFile(join(uploadDir, filename), buffer);
    const fileUrl = `/uploads/products/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (e) {
    console.error('Error writing file:', e);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

