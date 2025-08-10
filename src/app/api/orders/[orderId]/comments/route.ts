import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const commentSchema = z.object({
  text: z.string().min(1, 'Komentar ne može biti prazan.'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }>}
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { orderId } = await params;
    const body = await req.json();
    const validation = commentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { text } = validation.data;

    const newComment = await db.comment.create({
      data: {
        text,
        orderId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(newComment, { status: 201 });

  } catch (error) {
    console.error('[COMMENT_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
