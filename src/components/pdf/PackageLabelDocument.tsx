import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Order } from '@/generated/prisma';

// Tip za narudžbu sa shipping adresom
type OrderWithShipping = Order & {
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
};

// Stilovi za etiketu - prilagođeno za 10x15cm (otprilike 283x425 poena)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    padding: 20,
    flexDirection: 'column',
    width: '283pt',
    height: '425pt',
  },
  section: {
    border: '2pt solid black',
    padding: 15,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  addressBlock: {
    marginBottom: 30,
  },
  label: {
    fontSize: 10,
    color: 'grey',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  senderAddress: {
    marginTop: 'auto',
    fontSize: 10,
    textAlign: 'center',
  },
  hr: {
    borderBottom: '1pt solid #ccc',
    marginVertical: 20,
  },
});

interface PackageLabelDocumentProps {
  order: OrderWithShipping;
}

export const PackageLabelDocument = ({ order }: PackageLabelDocumentProps) => (
  <Document>
    <Page size={{ width: 283, height: 425 }} style={styles.page}>
      <View style={styles.section}>
        <View>
          <View style={styles.addressBlock}>
            <Text style={styles.label}>PRIMA:</Text>
            <Text style={styles.addressText}>{order.customerName}</Text>
            <Text>{order.shippingAddress.street}</Text>
            <Text>{order.shippingAddress.postalCode} {order.shippingAddress.city}</Text>
            <Text>{order.shippingAddress.country}</Text>
          </View>

          <View style={styles.hr} />

          <View style={styles.senderAddress}>
            <Text style={styles.label}>ŠALJE:</Text>
            <Text>Omerbasic d.o.o.</Text>
            <Text>Adresa 123, 71000 Sarajevo</Text>
            <Text>Bosna i Hercegovina</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
