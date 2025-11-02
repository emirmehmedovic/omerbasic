import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateManufacturerSchema } from '@/lib/validations/manufacturer';
import { getAdminSession } from '@/lib/api/admin-auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ manufacturerId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { manufacturerId } = await params;

  try {
    const manufacturer = await db.manufacturer.findUnique({
      where: { id: manufacturerId },
    });

    if (!manufacturer) {
      return new NextResponse('Not Found', { status: 404 });
    }

    return NextResponse.json(manufacturer);
  } catch (error) {
    console.error('[ADMIN_MANUFACTURER_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ manufacturerId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { manufacturerId } = await params;
    const body = await req.json();
    const payload = updateManufacturerSchema.parse(body);

    const existing = await db.manufacturer.findUnique({ where: { id: manufacturerId } });
    if (!existing) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const manufacturer = await db.manufacturer.update({
      where: { id: manufacturerId },
      data: {
        name: payload.name ?? existing.name,
        description: payload.description ?? existing.description,
        country: payload.country ?? existing.country,
        website: payload.website ?? existing.website,
      },
    });

    return NextResponse.json(manufacturer);
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    console.error('[ADMIN_MANUFACTURER_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ manufacturerId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { manufacturerId } = await params;

    await db.manufacturer.delete({
      where: { id: manufacturerId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ADMIN_MANUFACTURER_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
