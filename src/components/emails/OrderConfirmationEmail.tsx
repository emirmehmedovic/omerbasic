import React from 'react';
import { Order, OrderItem, Product } from '@/generated/prisma';

// Proširujemo tip da uključuje i proizvode unutar stavki
type OrderItemWithProduct = OrderItem & { product: Product };
type OrderWithItems = Order & { items: OrderItemWithProduct[] };

interface OrderConfirmationEmailProps {
  order: OrderWithItems;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(price);
};

const main = {
  fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  backgroundColor: '#f4f4f4',
  padding: '40px 20px',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #dddddd',
  borderRadius: '8px',
  overflow: 'hidden',
};

const header = {
  backgroundColor: '#4f46e5',
  padding: '20px',
  color: '#ffffff',
  textAlign: 'center' as const,
};

const content = {
  padding: '30px',
};

const h1 = {
  fontSize: '24px',
  margin: '0 0 10px 0',
};

const p = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#333333',
  margin: '0 0 20px 0',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const th = {
  textAlign: 'left' as const,
  padding: '8px',
  borderBottom: '1px solid #dddddd',
  color: '#555555',
  fontSize: '14px',
  textTransform: 'uppercase' as const,
};

const td = {
  textAlign: 'left' as const,
  padding: '8px',
  borderBottom: '1px solid #dddddd',
  fontSize: '16px',
};

const footer = {
  padding: '20px',
  textAlign: 'center' as const,
  fontSize: '12px',
  color: '#888888',
};

export const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({ order }) => (
  <div style={main}>
    <div style={container}>
      <div style={header}>
        <h1 style={h1}>Potvrda narudžbe</h1>
      </div>
      <div style={content}>
        <p>Poštovani/a {order.customerName},</p>
        <p>Hvala vam na kupovini. Vaša narudžba je uspješno primljena i trenutno se obrađuje. Ispod su detalji vaše narudžbe.</p>
        <p style={{ fontSize: '14px', color: '#555' }}><strong>ID Narudžbe:</strong> {order.id}</p>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Proizvod</th>
              <th style={th}>Količina</th>
              <th style={{ ...th, textAlign: 'right' as const }}>Cijena</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id}>
                <td style={td}>{item.product.name}</td>
                <td style={td}>{item.quantity}</td>
                <td style={{ ...td, textAlign: 'right' as const }}>{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ ...table, marginTop: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...td, borderBottom: 'none', fontWeight: 'bold' }}>Ukupno</td>
              <td style={{ ...td, borderBottom: 'none', textAlign: 'right' as const, fontWeight: 'bold' }}>{formatPrice(order.total)}</td>
            </tr>
          </tbody>
        </table>
        <p>Javit ćemo vam se ponovo kada vaša narudžba bude poslana.</p>
        <p>S poštovanjem,<br/>Vaš Webshop Tim</p>
      </div>
      <div style={footer}>
        <p>&copy; {new Date().getFullYear()} Vaš Webshop. Sva prava pridržana.</p>
      </div>
    </div>
  </div>
);
