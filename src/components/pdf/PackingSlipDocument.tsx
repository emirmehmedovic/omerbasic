import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Order, OrderItem, Product } from '@/generated/prisma';

// Definiramo tip za narudžbu sa svim uključenim relacijama koje su nam potrebne
type FullOrder = Order & {
  items: (OrderItem & {
    product: Product;
  })[];
};

// Definicija stilova za PDF dokument
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 60,
    paddingRight: 60,
    paddingBottom: 30,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dfdfdf',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#dfdfdf',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableColHeader: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 8,
  },
  productNameCol: {
    width: '60%',
  },
  quantityCol: {
    width: '20%',
    textAlign: 'center',
  },
  priceCol: {
    width: '20%',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center',
    color: 'grey',
    fontSize: 10,
  },
  address: {
    fontSize: 12,
  }
});

interface PackingSlipDocumentProps {
  order: FullOrder;
}

export const PackingSlipDocument = ({ order }: PackingSlipDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Otpremnica</Text>
        <View>
          <Text>Narudžba #: {order.id.substring(0, 8)}</Text>
          <Text>Datum: {new Date(order.createdAt).toLocaleDateString('bs-BA')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresa za dostavu</Text>
        <Text style={styles.address}>{order.customerName}</Text>
        <Text style={styles.address}>{(order.shippingAddress as any)?.street}</Text>
        <Text style={styles.address}>{(order.shippingAddress as any)?.city}, {(order.shippingAddress as any)?.postalCode}</Text>
        <Text style={styles.address}>{(order.shippingAddress as any)?.country}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stavke narudžbe</Text>
        <View style={styles.table}>
          {/* Zaglavlje tabele */}
          <View style={{...styles.tableRow, ...styles.tableColHeader}}>
            <View style={{width: '45%'}}><Text>Proizvod</Text></View>
            <View style={{width: '15%', textAlign: 'center'}}><Text>Količina</Text></View>
            <View style={{width: '20%', textAlign: 'right'}}><Text>Cijena</Text></View>
            <View style={{width: '20%', textAlign: 'right'}}><Text>Ukupno</Text></View>
          </View>
          {/* Sadržaj tabele */}
          {order.items.map(item => (
            <View style={styles.tableRow} key={item.id}>
              <View style={{...styles.tableCol, width: '45%'}}>
                <Text>{item.product.name}</Text>
                {item.product.sku ? <Text style={{fontSize: 9, color: '#666', marginTop: 2}}>SKU: {item.product.sku}</Text> : null}
                {item.product.oemNumber ? <Text style={{fontSize: 9, color: '#666', marginTop: 2}}>OEM: {item.product.oemNumber}</Text> : null}
              </View>
              <View style={{...styles.tableCol, width: '15%', textAlign: 'center'}}><Text>{item.quantity}</Text></View>
              <View style={{...styles.tableCol, width: '20%', textAlign: 'right'}}><Text>{item.price.toFixed(2)} BAM</Text></View>
              <View style={{...styles.tableCol, width: '20%', textAlign: 'right'}}><Text>{(item.price * item.quantity).toFixed(2)} BAM</Text></View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Hvala vam na kupovini!</Text>
      </View>
    </Page>
  </Document>
);
