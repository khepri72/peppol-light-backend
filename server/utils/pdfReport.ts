import PDFDocument from 'pdfkit';

interface PdfReportData {
  fileName: string;
  invoiceNumber: string;
  invoiceDate: string;
  analysisDate: string;
  score: number;
  status: string;
  errors: Array<{ message: string }>;
  warnings: Array<{ message: string }>;
  userPlan: string;
}

/**
 * Génère un rapport PDF de conformité Peppol
 */
export async function generatePdfReportBuffer(data: PdfReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Couleurs
      const primaryColor = '#1E5AA8';
      const successColor = '#16a34a';
      const warningColor = '#d97706';
      const errorColor = '#dc2626';

      // === EN-TÊTE ===
      doc.fontSize(24).fillColor(primaryColor).text('Peppol Light', { align: 'center' });
      doc.fontSize(12).fillColor('#666').text('Rapport de conformité Peppol', { align: 'center' });
      doc.moveDown(2);

      // === INFORMATIONS FACTURE ===
      doc.fontSize(14).fillColor('#000').text('Informations de la facture', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(11).fillColor('#333');
      doc.text(`Fichier : ${data.fileName}`);
      doc.text(`Numéro de facture : ${data.invoiceNumber || 'Non identifié'}`);
      doc.text(`Date de facture : ${data.invoiceDate || 'Non identifiée'}`);
      doc.text(`Date d'analyse : ${data.analysisDate}`);
      doc.moveDown(1.5);

      // === SCORE DE CONFORMITÉ ===
      doc.fontSize(14).fillColor('#000').text('Score de conformité', { underline: true });
      doc.moveDown(0.5);

      const scoreColor = data.score >= 90 ? successColor : data.score >= 70 ? warningColor : errorColor;
      doc.fontSize(28).fillColor(scoreColor).text(`${data.score}%`, { align: 'center' });
      doc.fontSize(11).fillColor('#666').text(`Statut : ${data.status}`, { align: 'center' });
      doc.moveDown(1.5);

      // === ERREURS ===
      if (data.errors.length > 0) {
        doc.fontSize(14).fillColor(errorColor).text(`Erreurs (${data.errors.length})`, { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10).fillColor('#333');
        data.errors.slice(0, 10).forEach((err, i) => {
          doc.text(`${i + 1}. ${err.message}`);
        });
        if (data.errors.length > 10) {
          doc.text(`... et ${data.errors.length - 10} autres erreurs`);
        }
        doc.moveDown(1);
      }

      // === AVERTISSEMENTS ===
      if (data.warnings.length > 0) {
        doc.fontSize(14).fillColor(warningColor).text(`Avertissements (${data.warnings.length})`, { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(10).fillColor('#333');
        data.warnings.slice(0, 10).forEach((warn, i) => {
          doc.text(`${i + 1}. ${warn.message}`);
        });
        if (data.warnings.length > 10) {
          doc.text(`... et ${data.warnings.length - 10} autres avertissements`);
        }
        doc.moveDown(1);
      }

      // === MESSAGE SELON LE PLAN ===
      doc.moveDown(1);
      doc.fontSize(12).fillColor(primaryColor).text('─'.repeat(50), { align: 'center' });
      doc.moveDown(0.5);

      if (data.userPlan === 'free') {
        doc.fontSize(12).fillColor(warningColor).text('🔒 Plan Gratuit', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333').text(
          'Passez au plan Starter ou supérieur pour accéder au téléchargement du fichier UBL/XML Peppol conforme.',
          { align: 'center' }
        );
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor(primaryColor).text('→ Upgrade sur peppollight.com/pricing', { align: 'center' });
      } else {
        doc.fontSize(12).fillColor(successColor).text(`✓ Plan ${data.userPlan.toUpperCase()}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#333').text(
          'Le fichier UBL/XML Peppol conforme est disponible au téléchargement dans votre dashboard.',
          { align: 'center' }
        );
      }

      // === PIED DE PAGE ===
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999').text(
        `Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - Peppol Light © ${new Date().getFullYear()}`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

