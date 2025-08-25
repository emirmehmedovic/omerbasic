import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/i).optional(),
  isActive: z.boolean().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO']).optional(),
  mediaUrl: z.string().url().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const screen = await db.advertisingScreen.findUnique({ where: { id } });
    if (!screen) return new NextResponse('Not found', { status: 404 });
    return NextResponse.json(screen);
  } catch (e) {
    console.error('[ADS_SCREENS_ID_GET]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await db.advertisingScreen.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(e.format()), { status: 400 });
    }
    if (e?.code === 'P2025') {
      return new NextResponse('Not found', { status: 404 });
    }
    if (e?.code === 'P2002') {
      return new NextResponse('Slug already exists', { status: 409 });
    }
    console.error('[ADS_SCREENS_ID_PUT]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 403 });

    const { id } = await params;
    await db.advertisingScreen.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('[ADS_SCREENS_ID_DELETE]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
