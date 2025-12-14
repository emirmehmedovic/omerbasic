import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Order, OrderItem, Product, User } from '@/generated/prisma';

// Tip za narudžbu sa svim relacijama
type FullOrder = Order & {
  user: User;
  items: (OrderItem & {
    product: Product;
  })[];
};

// Stilovi
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 40,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  companyInfo: {
    textAlign: 'right',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 5,
  },
  address: {
    fontSize: 11,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#bfbfbf',
    borderBottomWidth: 1,
  },
  tableColHeader: {
    backgroundColor: '#f2f2f2',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
  },
  tableCol: {
    padding: 6,
    fontSize: 10,
  },
  colId: { width: '10%' },
  colName: { width: '40%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  summaryTable: {
    marginTop: 20,
    width: '40%',
    marginLeft: 'auto',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    marginTop: 5,
    paddingTop: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: 'grey',
    fontSize: 9,
  },
});

interface InvoiceDocumentProps {
  order: FullOrder;
}

export const InvoiceDocument = ({ order }: InvoiceDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>FAKTURA</Text>
        <View style={styles.companyInfo}>
          <Text>Omerbasic d.o.o.</Text>
          <Text>Adresa 123, 71000 Sarajevo</Text>
          <Text>PDV: 201234567890</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View>
          <Text style={styles.sectionTitle}>Kupac</Text>
          <Text style={styles.address}>{order.customerName}</Text>
          <Text style={styles.address}>{(order.billingAddress as any)?.street}</Text>
          <Text style={styles.address}>{(order.billingAddress as any)?.city}, {(order.billingAddress as any)?.postalCode}</Text>
          <Text style={styles.address}>{(order.billingAddress as any)?.country}</Text>
        </View>
        <View style={{textAlign: 'right'}}>
          <Text>Broj fakture: INV-{order.id.substring(0, 6)}</Text>
          <Text>Datum: {new Date(order.createdAt).toLocaleDateString('bs-BA')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Stavke</Text>
      <View style={styles.table}>
        <View style={{...styles.tableRow, ...styles.tableColHeader}}>
          <Text style={{...styles.tableCol, ...styles.colId}}>ID</Text>
          <Text style={{...styles.tableCol, ...styles.colName}}>Naziv proizvoda</Text>
          <Text style={{...styles.tableCol, ...styles.colQty}}>Količina</Text>
          <Text style={{...styles.tableCol, ...styles.colPrice}}>Cijena</Text>
          <Text style={{...styles.tableCol, ...styles.colTotal}}>Ukupno</Text>
        </View>
        {order.items.map((item, index) => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={{...styles.tableCol, ...styles.colId}}>{index + 1}</Text>
            <View style={{...styles.tableCol, ...styles.colName}}>
              <Text>{item.product.name}</Text>
              {item.product.sku ? <Text style={{fontSize: 8, color: '#666', marginTop: 2}}>SKU: {item.product.sku}</Text> : null}
              {item.product.oemNumber ? <Text style={{fontSize: 8, color: '#666', marginTop: 2}}>OEM: {item.product.oemNumber}</Text> : null}
            </View>
            <Text style={{...styles.tableCol, ...styles.colQty}}>{item.quantity}</Text>
            <Text style={{...styles.tableCol, ...styles.colPrice}}>{item.price.toFixed(2)}</Text>
            <Text style={{...styles.tableCol, ...styles.colTotal}}>{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.summaryTable}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text>{order.subtotal.toFixed(2)} BAM</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Dostava:</Text>
          <Text>{order.shippingCost.toFixed(2)} BAM</Text>
        </View>
        <View style={{...styles.summaryRow, ...styles.summaryTotal}}>
          <Text style={styles.summaryLabel}>UKUPNO:</Text>
          <Text>{order.total.toFixed(2)} BAM</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Plaćanje po preuzimanju. Hvala na povjerenju!</Text>
      </View>
    </Page>
  </Document>
);
