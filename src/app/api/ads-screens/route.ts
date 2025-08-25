import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

const screenSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i, 'Slug may contain letters, numbers and dashes'),
  isActive: z.boolean().optional().default(true),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  mediaUrl: z.string().url(),
});

export async function GET() {
  try {
    const screens = await db.advertisingScreen.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(screens);
  } catch (e) {
    console.error('[ADS_SCREENS_GET]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') return new NextResponse('Unauthorized', { status: 403 });

    const body = await req.json();
    const data = screenSchema.parse(body);

    const created = await db.advertisingScreen.create({ data });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(e.format()), { status: 400 });
    }
    if (e?.code === 'P2002') {
      return new NextResponse('Slug already exists', { status: 409 });
    }
    console.error('[ADS_SCREENS_POST]', e);
    return new NextResponse('Internal error', { status: 500 });
  }
}
