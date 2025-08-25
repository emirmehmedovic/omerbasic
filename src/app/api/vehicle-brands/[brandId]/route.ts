import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId } = await params;

    // Ensure the brand exists first for better error message
    const existing = await db.vehicleBrand.findUnique({ where: { id: brandId } });
    if (!existing) {
      return NextResponse.json({ error: 'Marka vozila nije pronađena' }, { status: 404 });
    }

    // Cascade deletes handled by Prisma relations (onDelete: Cascade)
    await db.vehicleBrand.delete({ where: { id: brandId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting vehicle brand:', error);
    return NextResponse.json({ error: 'Greška prilikom brisanja marke vozila' }, { status: 500 });
  }
}
