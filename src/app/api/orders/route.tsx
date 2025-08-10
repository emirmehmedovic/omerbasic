import React from 'react';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { Resend } from 'resend';
import { OrderConfirmationEmail } from '@/components/emails/OrderConfirmationEmail';
import { checkoutFormSchema } from '@/lib/validations/order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Inicijaliziramo Resend samo ako je API ključ dostupan
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Proširujemo shemu da uključuje i stavke iz korpe, koje ćemo slati s klijenta
const orderApiSchema = checkoutFormSchema.extend({
  cartItems: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    originalPrice: z.number().optional(), // Dodajemo originalPrice za B2B cijene
  })),
  subtotal: z.number(),
  shippingCost: z.number(),
  total: z.number(),
});

export async function POST(req: Request) {
  try {
    // Dohvati sesiju za B2B podatke direktno s authOptions
    const session = await getServerSession(authOptions);
    
    // Provjeri B2B status i popust
    const isB2B = session?.user?.role === 'B2B';
    const discountPercentage = isB2B ? (session?.user?.discountPercentage || 0) : 0;
    
    console.log('[API_ORDERS] Session:', session ? 'postoji' : 'ne postoji');
    console.log('[API_ORDERS] User ID:', session?.user?.id || 'nije dostupan');
    console.log('[API_ORDERS] User Email:', session?.user?.email || 'nije dostupan');
    console.log('[API_ORDERS] isB2B:', isB2B);
    console.log('[API_ORDERS] discountPercentage:', discountPercentage);
    
    const body = await req.json();
    const validation = orderApiSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      customerName,
      customerEmail,
      shippingAddress,
      cartItems,
      subtotal,
      shippingCost,
      total,
      shippingMethod,
      paymentMethod,
    } = validation.data;
    
    // Primijeni B2B popust ako je potrebno
    const orderItems = cartItems.map(item => {
      // Cijena je već trebala biti diskontirana na frontendu kroz API košarice
      // ali ovdje dodatno osiguravamo da je cijena ispravna
      return {
        productId: item.id,
        quantity: item.quantity,
        price: item.price, // Već diskontirana cijena
        originalPrice: item.originalPrice, // Originalna cijena ako postoji (za B2B)
      };
    });

    // Koristimo transakciju kako bismo osigurali da se sve operacije izvrše uspješno
    const newOrder = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log('[API_ORDERS] Prije kreiranja narudžbe - User ID:', session?.user?.id || 'nije dostupan');
      console.log('[API_ORDERS] Customer Email:', customerEmail);
      
      // Ako korisnik nije prijavljen, pokušajmo pronaći korisnika po emailu
      let userId = session?.user?.id || null;
      if (!userId && customerEmail) {
        try {
          const userByEmail = await tx.user.findUnique({
            where: { email: customerEmail }
          });
          if (userByEmail) {
            userId = userByEmail.id;
            console.log('[API_ORDERS] Pronađen korisnik po emailu:', userByEmail.id);
          }
        } catch (error) {
          console.error('[API_ORDERS] Greška pri traženju korisnika po emailu:', error);
        }
      }
      
      const order = await tx.order.create({
        data: {
          customerName,
          customerEmail,
          shippingAddress: shippingAddress,
          subtotal: subtotal,
          shippingCost: shippingCost,
          total: total,
          status: 'PENDING',
          shippingMethod: shippingMethod,
          paymentMethod: paymentMethod,
          // Povezujemo narudžbu s korisnikom ako je prijavljen ili pronađen po emailu
          userId: userId,
          // Koristimo orderItems koji sadrži B2B cijene
          items: {
            create: orderItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price, // Već diskontirana cijena
              originalPrice: item.originalPrice, // Originalna cijena ako postoji (za B2B)
            })),
          },
          // Dodajemo informaciju o B2B korisniku i popustu ako postoji
          isB2BOrder: isB2B,
          discountPercentage: discountPercentage > 0 ? discountPercentage : null,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Slanje emaila nakon uspješnog kreiranja narudžbe
      try {
        // Provjera da li je Resend inicijaliziran
        if (resend) {
          await resend.emails.send({
            from: 'onboarding@resend.dev', // Promijenite u vašu verificiranu domenu
            to: order.customerEmail,
            subject: `Potvrda narudžbe #${order.id.substring(0, 8)}`,
            react: <OrderConfirmationEmail order={order} />,
          });
        } else {
          // Fallback opcija - samo logiramo da email nije poslan
          console.log('Email nije poslan: Resend API ključ nije dostupan');
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Ne zaustavljamo transakciju ako email ne uspije, ali logiramo grešku
      }

      return order;
    });

    return NextResponse.json({ orderId: newOrder.id }, { status: 201 });

  } catch (error) {
    console.error('[ORDER_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
