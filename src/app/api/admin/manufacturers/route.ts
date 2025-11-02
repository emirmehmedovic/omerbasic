import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createManufacturerSchema } from '@/lib/validations/manufacturer';
import { slugify } from '@/lib/utils';
import { Prisma } from '@/generated/prisma/client';
import { getAdminSession } from '@/lib/api/admin-auth';

async function generateUniqueSlug(baseName: string) {
  const baseSlug = slugify(baseName) || 'proizvodjac';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.manufacturer.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter++}`;
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const manufacturers = await db.manufacturer.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error('[ADMIN_MANUFACTURERS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, country, website } = createManufacturerSchema.parse(body);

    const slug = await generateUniqueSlug(name);

    const manufacturer = await db.manufacturer.create({
      data: {
        name,
        slug,
        description: description ?? null,
        country: country ?? null,
        website: website ?? null,
      },
    });

    return NextResponse.json(manufacturer, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Proizvođač s ovim slugom već postoji.' },
          { status: 409 }
        );
      }
    }

    if (error instanceof Error) {
      console.error('[ADMIN_MANUFACTURERS_POST]', error);
    }

    if ((error as any)?.issues) {
      return NextResponse.json((error as any).issues, { status: 422 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
