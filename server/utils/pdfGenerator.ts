import PDFDocument from 'pdfkit';
import { Invoice, UserSettings } from '../../shared/schema';

export interface InvoiceWithUserSettings {
  invoice: Invoice;
  companyName: string;
  settings?: Partial<UserSettings>;
}

export function generateInvoicePDF(data: InvoiceWithUserSettings): typeof PDFDocument {
  const { invoice, companyName, settings } = data;
  const doc = new PDFDocument({ margin: 50 });

  const primaryColor = settings?.primaryColor || '#2563EB';
  const lightGray = '#6B7280';
  const darkGray = '#111827';

  doc.fontSize(24)
    .fillColor(primaryColor)
    .text(companyName || 'Invoice', 50, 50);

  doc.fontSize(10)
    .fillColor(lightGray)
    .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 85)
    .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 50, 100)
    .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 115)
    .text(`Status: ${invoice.status.toUpperCase()}`, 50, 130);

  doc.moveDown(2);

  if (settings?.companyAddress || settings?.companyPhone) {
    let yPos = 170;
    doc.fontSize(10)
      .fillColor(darkGray)
      .text('From:', 350, yPos);
    yPos += 15;
    if (settings.companyAddress) {
      doc.fontSize(9)
        .fillColor(lightGray)
        .text(settings.companyAddress, 350, yPos, { width: 150 });
      yPos += 12;
    }
    if (settings.companyPhone) {
      doc.text(settings.companyPhone, 350, yPos);
    }
  }

  doc.fontSize(12)
    .fillColor(darkGray)
    .text('Bill To:', 50, 170)
    .fontSize(10)
    .fillColor(lightGray)
    .text(invoice.clientName, 50, 190)
    .text(invoice.clientEmail, 50, 205);

  const tableTop = 250;
  const itemCodeX = 50;
  const descriptionX = 150;
  const quantityX = 350;
  const priceX = 420;
  const amountX = 490;

  doc.fontSize(10)
    .fillColor(darkGray)
    .text('Item', itemCodeX, tableTop)
    .text('Description', descriptionX, tableTop)
    .text('Qty', quantityX, tableTop)
    .text('Price', priceX, tableTop)
    .text('Amount', amountX, tableTop);

  doc.moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .strokeColor(lightGray)
    .stroke();

  let yPosition = tableTop + 30;
  let itemNumber = 1;

  for (const item of invoice.items) {
    const itemTotal = item.quantity * item.unitPrice;
    
    doc.fontSize(9)
      .fillColor(darkGray)
      .text(itemNumber.toString(), itemCodeX, yPosition)
      .text(item.description, descriptionX, yPosition, { width: 180 })
      .text(item.quantity.toString(), quantityX, yPosition)
      .text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, priceX, yPosition)
      .text(`${invoice.currency} ${itemTotal.toFixed(2)}`, amountX, yPosition);

    yPosition += 25;
    itemNumber++;
  }

  yPosition += 20;
  doc.moveTo(350, yPosition)
    .lineTo(550, yPosition)
    .strokeColor(lightGray)
    .stroke();

  yPosition += 15;
  doc.fontSize(10)
    .fillColor(darkGray)
    .text('Subtotal:', 350, yPosition)
    .text(`${invoice.currency} ${invoice.amount.toFixed(2)}`, amountX, yPosition);

  yPosition += 20;
  doc.fontSize(12)
    .fillColor(primaryColor)
    .text('Total:', 350, yPosition)
    .text(`${invoice.currency} ${invoice.amount.toFixed(2)}`, amountX, yPosition);

  if (invoice.notes) {
    yPosition += 40;
    doc.fontSize(10)
      .fillColor(darkGray)
      .text('Notes:', 50, yPosition);
    
    yPosition += 20;
    doc.fontSize(9)
      .fillColor(lightGray)
      .text(invoice.notes, 50, yPosition, { width: 500 });
  }

  const footerText = settings?.footerText || `Generated on ${new Date().toLocaleDateString()}`;
  doc.fontSize(8)
    .fillColor(lightGray)
    .text(
      footerText,
      50,
      doc.page.height - 50,
      { align: 'center', width: 500 }
    );

  return doc;
}
