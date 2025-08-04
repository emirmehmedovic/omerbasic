import { Order, OrderStatus } from '@/generated/prisma';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Tailwind,
} from '@react-email/components';
import React from 'react';

interface OrderStatusUpdateEmailProps {
  order: Order;
  newStatus: OrderStatus;
}

const statusTranslations: { [key in OrderStatus]: string } = {
  PENDING: 'Na čekanju',
  PROCESSING: 'U obradi',
  SHIPPED: 'Poslano',
  DELIVERED: 'Isporučeno',
  CANCELLED: 'Otkazano',
};

export function OrderStatusUpdateEmail({ order, newStatus }: OrderStatusUpdateEmailProps) {
  const previewText = `Status vaše narudžbe je ažuriran na: ${statusTranslations[newStatus]}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto my-4">
            <Heading className="text-2xl font-bold text-gray-800 text-center">Status narudžbe ažuriran</Heading>
            <Text className="text-gray-600 mt-4">
              Poštovani/a {order.customerName},
            </Text>
            <Text className="text-gray-600 mt-4">
              Status vaše narudžbe #{order.id.substring(0, 8)} je promijenjen.
            </Text>
            <Text className="text-xl font-semibold text-gray-800 mt-6">
              Novi status: <span className="text-indigo-600">{statusTranslations[newStatus]}</span>
            </Text>
            <Text className="text-gray-600 mt-6">
              Možete pratiti detalje vaše narudžbe na našoj stranici.
            </Text>
            <Text className="text-gray-500 mt-8 text-sm">
              Hvala vam na povjerenju.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
