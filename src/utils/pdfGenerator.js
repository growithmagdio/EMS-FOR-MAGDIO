import { jsPDF } from 'jspdf';

/**
 * Loads an image from a URL, relative path, or data URI and converts it to a PNG base64 string.
 * Supports SVGs by rendering them to an offscreen high-DPI HTML canvas.
 * 
 * @param {string} src 
 * @returns {Promise<string|null>}
 */
async function getBase64Image(src) {
  if (!src) return null;
  if (typeof src === 'string' && src.startsWith('data:image')) {
    return src;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = 4; // High DPI for crystal-clear PDF print resolution
          const w = (img.naturalWidth || img.width || 48) * scale;
          const h = (img.naturalHeight || img.height || 48) * scale;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (canvasErr) {
          console.warn('[pdfGenerator] Canvas conversion failed:', canvasErr);
          resolve(null);
        }
      };
      img.onerror = (e) => {
        console.warn('[pdfGenerator] Failed to load logo from src:', src, e);
        resolve(null);
      };
      img.src = src;
    } catch (err) {
      console.warn('[pdfGenerator] Image load error:', err);
      resolve(null);
    }
  });
}

function drawBrandFallback(doc, x, y) {
  doc.setFillColor(134, 59, 255); // #863bff (MAGDIO Brand Purple)
  doc.roundedRect(x, y, 14, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('M', x + 7, y + 9.5, { align: 'center' });
}

/**
 * Generates and downloads a clean, professional, high-resolution A4 business PDF
 * for any invoice directly using jsPDF vector graphics and typography.
 * 
 * Guarantees 100% reliable execution in all browser environments without DOM or
 * Tailwind v4 color space parsing issues.
 * 
 * @param {Object} invoice - The invoice data object from Firestore / state
 * @returns {Promise<void>}
 */
export async function downloadInvoicePDF(invoice) {
  try {
    if (!invoice) {
      console.error('[pdfGenerator] Invoice data is missing or undefined.');
      throw new Error('Invoice data is missing.');
    }

    // 1. Safe Number & String Normalization
    const currencySymbol = invoice.currencySymbol || '$';
    const totalAmount = Number(invoice.totalAmount || 0);
    const amountPaid = Number(invoice.amountPaid || 0);
    const balanceDue = Math.max(0, Number((invoice.balanceDue ?? (totalAmount - amountPaid)).toFixed(2)));
    const subtotal = Number(invoice.subtotal ?? (totalAmount + Number(invoice.discountAmount || 0) - Number(invoice.taxAmount || 0)));
    const discountAmount = Number(invoice.discountAmount || 0);
    const taxAmount = Number(invoice.taxAmount || 0);
    const taxRate = Number(invoice.taxRate || 0);

    let displayStatus = (invoice.status || 'Draft').toUpperCase();
    if (balanceDue === 0 && totalAmount > 0) {
      displayStatus = 'PAID';
    }

    const invoiceNumber = invoice.invoiceNumber || 'INV-2026-0001';
    const safeFilenameNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `Invoice-${safeFilenameNumber}.pdf`;

    const clientCompany = invoice.clientCompany || invoice.client?.companyName || invoice.clientName || 'Valued Client';
    const clientName = invoice.clientName || invoice.client?.name || '';
    const clientEmail = invoice.clientEmail || invoice.client?.email || '';
    const clientPhone = invoice.clientPhone || invoice.client?.phone || '';
    const clientAddress = invoice.clientAddress || invoice.client?.address || '';
    const issueDate = invoice.issueDate || new Date().toISOString().split('T')[0];
    const dueDate = invoice.dueDate || '-';
    const projectName = invoice.projectName || '';
    const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [
      { description: 'Professional Services / Milestone Deliverable', quantity: 1, unitPrice: totalAmount, total: totalAmount }
    ];

    // 2. Initialize jsPDF in A4 Portrait mode (210mm x 297mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const leftMargin = 14;
    const rightMargin = 196;
    const contentWidth = rightMargin - leftMargin; // 182

    let currentY = 16;

    // Helper: format currency
    const fmt = (val) => `${currencySymbol}${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ==========================================
    // A. HEADER: BRANDING & INVOICE META
    // ==========================================
    
    // Load and render the official MAGDIO Logo
    const logoSrc = invoice.companyLogo || invoice.logo || '/favicon.svg';
    let logoDataUrl = null;
    try {
      logoDataUrl = await getBase64Image(logoSrc);
    } catch {
      logoDataUrl = null;
    }

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', leftMargin, currentY, 14, 14);
      } catch (imgErr) {
        console.warn('[pdfGenerator] Error adding logo image to PDF:', imgErr);
        drawBrandFallback(doc, leftMargin, currentY);
      }
    } else {
      drawBrandFallback(doc, leftMargin, currentY);
    }

    // Company Name & Subtitle
    doc.setTextColor(17, 24, 39); // #111827
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MAGDIO', leftMargin + 17, currentY + 5.5);

    doc.setTextColor(134, 59, 255); // #863bff MAGDIO brand purple
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('THE AI GROWTH STUDIO', leftMargin + 17, currentY + 10);

    // Right Side: Big "INVOICE" Title & Number
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('INVOICE', rightMargin, currentY + 5.5, { align: 'right' });

    doc.setTextColor(134, 59, 255);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(`#${invoiceNumber}`, rightMargin, currentY + 11, { align: 'right' });

    currentY += 17;

    // Company Subtext & Invoice Dates Row
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('MAGDIO Software Solutions Pvt Ltd', leftMargin, currentY);
    doc.text('Support: support@magdio.com  |  www.magdio.com', leftMargin, currentY + 4);

    // Dates on Right
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(`Issue Date: `, rightMargin - 32, currentY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(issueDate, rightMargin, currentY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text(`Due Date: `, rightMargin - 32, currentY + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(dueDate, rightMargin, currentY + 4, { align: 'right' });

    if (projectName) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(75, 85, 99);
      doc.text(`Project: `, rightMargin - 32, currentY + 8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      doc.text(projectName, rightMargin, currentY + 8, { align: 'right' });
    }

    currentY += 14;

    // Divider Line
    doc.setDrawColor(229, 231, 235); // #e5e7eb
    doc.setLineWidth(0.4);
    doc.line(leftMargin, currentY, rightMargin, currentY);

    currentY += 6;

    // ==========================================
    // B. BILLED TO & PAYMENT STATUS BOXES
    // ==========================================
    const cardHeight = 32;
    const cardWidth = (contentWidth - 6) / 2; // 88mm each

    // Left Card: Billed To
    doc.setFillColor(249, 250, 251); // #f9fafb
    doc.setDrawColor(243, 244, 246);
    doc.roundedRect(leftMargin, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(156, 163, 175); // #9ca3af
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('BILLED TO (CLIENT / CUSTOMER)', leftMargin + 4, currentY + 5);

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(clientCompany.substring(0, 38), leftMargin + 4, currentY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    let clientY = currentY + 16;
    if (clientName && clientName !== clientCompany) {
      doc.text(`Attn: ${clientName}`, leftMargin + 4, clientY);
      clientY += 4;
    }
    if (clientEmail) {
      doc.text(`Email: ${clientEmail}`, leftMargin + 4, clientY);
      clientY += 4;
    }
    if (clientPhone && clientY <= currentY + cardHeight - 2) {
      doc.text(`Phone: ${clientPhone}`, leftMargin + 4, clientY);
      clientY += 4;
    }
    if (clientAddress && clientY <= currentY + cardHeight - 2) {
      doc.text(clientAddress.substring(0, 42), leftMargin + 4, clientY);
    }

    // Right Card: Payment Status & Balance Due
    const rightCardX = leftMargin + cardWidth + 6;
    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.setDrawColor(219, 234, 254);
    doc.roundedRect(rightCardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('PAYMENT STATUS', rightCardX + 4, currentY + 5);

    // Status Pill
    let pillBg = [243, 244, 246];
    let pillText = [55, 65, 81];
    if (displayStatus === 'PAID') {
      pillBg = [209, 250, 229]; // emerald-100
      pillText = [6, 95, 70];   // emerald-800
    } else if (displayStatus === 'PARTIALLY PAID') {
      pillBg = [219, 234, 254]; // blue-100
      pillText = [30, 64, 175];  // blue-800
    } else if (displayStatus === 'SENT' || displayStatus === 'PENDING') {
      pillBg = [254, 243, 199]; // amber-100
      pillText = [146, 64, 14];  // amber-800
    } else if (displayStatus === 'OVERDUE') {
      pillBg = [255, 228, 230]; // rose-100
      pillText = [159, 18, 57];  // rose-800
    }

    doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
    doc.roundedRect(rightCardX + 4, currentY + 7.5, 34, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(pillText[0], pillText[1], pillText[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(displayStatus, rightCardX + 21, currentY + 11.5, { align: 'center' });

    // Balance Due inside Right Card
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Total Balance Due', rightCardX + 4, currentY + 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    if (balanceDue > 0) {
      doc.setTextColor(225, 29, 72); // rose-600
    } else {
      doc.setTextColor(5, 150, 105); // emerald-600
    }
    doc.text(fmt(balanceDue), rightCardX + 4, currentY + 26);

    currentY += cardHeight + 8;

    // ==========================================
    // C. LINE ITEMS TABLE
    // ==========================================
    
    // Table Header
    const colX = {
      num: leftMargin + 2,
      desc: leftMargin + 12,
      qty: rightMargin - 65,
      rate: rightMargin - 35,
      total: rightMargin - 2
    };

    doc.setFillColor(243, 244, 246); // #f3f4f6
    doc.rect(leftMargin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    doc.line(leftMargin, currentY + 7, rightMargin, currentY + 7);

    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('#', colX.num, currentY + 4.8);
    doc.text('ITEM & DESCRIPTION', colX.desc, currentY + 4.8);
    doc.text('QTY', colX.qty, currentY + 4.8, { align: 'center' });
    doc.text('UNIT PRICE', colX.rate, currentY + 4.8, { align: 'right' });
    doc.text('TOTAL', colX.total, currentY + 4.8, { align: 'right' });

    currentY += 7;

    // Render Table Rows
    items.forEach((item, idx) => {
      const rowHeight = 7.5;
      
      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(leftMargin, currentY, contentWidth, rowHeight, 'F');
      }

      doc.setDrawColor(243, 244, 246);
      doc.line(leftMargin, currentY + rowHeight, rightMargin, currentY + rowHeight);

      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${idx + 1}`, colX.num, currentY + 5);

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const itemDesc = (item.description || 'Service').substring(0, 52);
      doc.text(itemDesc, colX.desc, currentY + 5);

      doc.setTextColor(75, 85, 99);
      doc.text(`${item.quantity || 1}`, colX.qty, currentY + 5, { align: 'center' });
      doc.text(fmt(item.unitPrice), colX.rate, currentY + 5, { align: 'right' });

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(item.total || (item.quantity * item.unitPrice)), colX.total, currentY + 5, { align: 'right' });

      currentY += rowHeight;
    });

    currentY += 4;

    // ==========================================
    // D. TOTALS & SUMMARY SECTION (Right) + BANK / NOTES (Left)
    // ==========================================
    const summaryWidth = 72;
    const summaryX = rightMargin - summaryWidth;
    const leftNotesWidth = contentWidth - summaryWidth - 8;

    const summaryStartY = currentY;

    // Left Notes & Bank Instructions
    let notesY = currentY;
    if (invoice.bankDetails) {
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(leftMargin, notesY, leftNotesWidth, 18, 1.5, 1.5, 'FD');

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('PAYMENT / WIRE INSTRUCTIONS:', leftMargin + 3, notesY + 4);

      doc.setTextColor(75, 85, 99);
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      const splitBank = doc.splitTextToSize(invoice.bankDetails, leftNotesWidth - 6);
      doc.text(splitBank.slice(0, 3), leftMargin + 3, notesY + 8);

      notesY += 21;
    }

    if (invoice.notes && notesY < pageHeight - 50) {
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('NOTES & TERMS:', leftMargin, notesY + 3);

      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const splitNotes = doc.splitTextToSize(invoice.notes, leftNotesWidth);
      doc.text(splitNotes.slice(0, 2), leftMargin, notesY + 7);
      notesY += 12;
    }

    // Right Summary Column
    let sumY = summaryStartY;

    const drawSummaryRow = (label, value, isBold = false, textColor = [75, 85, 99]) => {
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.text(label, summaryX, sumY + 4);
      doc.text(value, rightMargin, sumY + 4, { align: 'right' });
      sumY += 5.5;
    };

    drawSummaryRow('Subtotal', fmt(subtotal));

    if (discountAmount > 0) {
      const discLabel = invoice.discountType === 'percentage' ? `Discount (${invoice.discountValue}%)` : 'Discount';
      drawSummaryRow(discLabel, `-${fmt(discountAmount)}`, false, [5, 150, 105]);
    }

    if (taxAmount > 0) {
      drawSummaryRow(`Tax (${taxRate}%)`, `+${fmt(taxAmount)}`);
    }

    // Total Line
    doc.setDrawColor(17, 24, 39);
    doc.setLineWidth(0.4);
    doc.line(summaryX, sumY + 1, rightMargin, sumY + 1);
    sumY += 2;

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Grand Total', summaryX, sumY + 5);
    doc.text(fmt(totalAmount), rightMargin, sumY + 5, { align: 'right' });
    sumY += 7.5;

    // Amount Paid & Balance Due
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(summaryX, sumY, rightMargin, sumY);
    sumY += 2;

    if (amountPaid > 0 || displayStatus === 'PAID') {
      drawSummaryRow('Amount Paid', fmt(amountPaid), true, [5, 150, 105]);
    }

    const balanceColor = balanceDue > 0 ? [225, 29, 72] : [5, 150, 105];
    doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Balance Due', summaryX, sumY + 4);
    doc.text(fmt(balanceDue), rightMargin, sumY + 4, { align: 'right' });

    // ==========================================
    // E. FOOTER / AUTHORIZED SIGNATURE
    // ==========================================
    const footerY = pageHeight - 25;
    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, footerY, rightMargin, footerY);

    // Left Signature
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Authorized Signature', leftMargin, footerY + 5);

    doc.setDrawColor(209, 213, 219);
    doc.line(leftMargin, footerY + 14, leftMargin + 40, footerY + 14);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('For MAGDIO Software Solutions Pvt Ltd', leftMargin, footerY + 18);

    // Right Thank You
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Thank you for your business!', rightMargin, footerY + 6, { align: 'right' });

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Questions? Contact support@magdio.com', rightMargin, footerY + 10, { align: 'right' });

    // 3. Save File
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('[pdfGenerator] Critical PDF generation error:', error);
    throw error;
  }
}
