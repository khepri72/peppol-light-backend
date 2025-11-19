import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, 'sample-invoice.pdf');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream(outputPath));

// En-tête
doc.fontSize(20).text('FACTURE', { align: 'center' });
doc.moveDown();

// Informations facture
doc.fontSize(12);
doc.text(`Facture n° : INV-2025-001`, 50, 100);
doc.text(`Date : 19/11/2025`, 50, 120);
doc.text(`Référence client : REF-CLIENT-123`, 50, 140);
doc.moveDown();

// Fournisseur
doc.fontSize(14).text('Fournisseur :', 50, 180);
doc.fontSize(11);
doc.text('Entreprise Example SPRL', 50, 200);
doc.text('TVA : BE0123456789', 50, 215);
doc.text('N° BCE : 0123456789', 50, 230);
doc.text('Rue de la Loi 123', 50, 245);
doc.text('1000 Bruxelles, Belgique', 50, 260);
doc.moveDown();

// Client
doc.fontSize(14).text('Client :', 50, 300);
doc.fontSize(11);
doc.text('Client Test SA', 50, 320);
doc.text('TVA : BE0987654321', 50, 335);
doc.text('Avenue Louise 456', 50, 350);
doc.text('1050 Bruxelles, Belgique', 50, 365);
doc.moveDown();

// Lignes de facturation
doc.fontSize(14).text('Détails de la facture :', 50, 410);
doc.fontSize(10);
doc.text('Description', 50, 435);
doc.text('Qté', 300, 435);
doc.text('Prix unit.', 350, 435);
doc.text('TVA %', 420, 435);
doc.text('Total', 470, 435);
doc.moveTo(50, 450).lineTo(550, 450).stroke();

doc.fontSize(10);
doc.text('Prestation de services conseil', 50, 460);
doc.text('5', 300, 460);
doc.text('100,00 €', 350, 460);
doc.text('21%', 420, 460);
doc.text('500,00 €', 470, 460);

doc.text('Formation équipe', 50, 480);
doc.text('2', 300, 480);
doc.text('250,00 €', 350, 480);
doc.text('21%', 420, 480);
doc.text('500,00 €', 470, 480);

doc.moveDown();
doc.moveTo(50, 510).lineTo(550, 510).stroke();

// Totaux
doc.fontSize(11);
doc.text('Total HT :', 370, 530);
doc.text('1000,00 €', 470, 530);

doc.text('TVA (21%) :', 370, 550);
doc.text('210,00 €', 470, 550);

doc.fontSize(12).font('Helvetica-Bold');
doc.text('Total TTC :', 370, 570);
doc.text('1210,00 €', 470, 570);

doc.fontSize(9).font('Helvetica');
doc.text('Paiement sous 30 jours. Merci de votre confiance.', 50, 650, { align: 'center' });

doc.end();

console.log(`✅ PDF de test généré : ${outputPath}`);
