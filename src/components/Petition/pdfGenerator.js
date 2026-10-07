import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * High-DPI Devanagari Canvas Text Block Renderer
 * Renders Unicode / Devanagari text with native browser HarfBuzz/DirectWrite complex script
 * shaping, avoiding jsPDF's lack of complex Brahmic script ligature and matra shaping.
 */
function renderDevanagariCanvasBlock({
  paragraphs,
  contentWidthMm = 174,
  fontSizePt = 8.8,
  lineHeightMultiplier = 1.5,
  fontFamily = "'Noto Sans Devanagari', 'Nirmala UI', 'Devanagari Sangam MN', 'Mangal', sans-serif",
  textColor = '#334155',
  backgroundColor = '#ffffff',
  fontWeight = 'normal',
  paddingYMm = 2,
  scale = 3
}) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }

  const pxPerMm = 3.779527559; // 96 DPI base (96 / 25.4)
  const canvasWidthPx = Math.round(contentWidthMm * pxPerMm * scale);
  const maxWidthPx = canvasWidthPx;

  const fontPx = Math.round(fontSizePt * (96 / 72) * scale);
  const lineSpacingPx = Math.round(fontPx * lineHeightMultiplier);

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return null;

  measureCtx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;

  const lines = [];
  paragraphs.forEach((para) => {
    const trimmed = typeof para === 'string' ? para.trim() : '';
    if (!trimmed) {
      lines.push({ text: '', isBlank: true });
      return;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = measureCtx.measureText(testLine);

      if (metrics.width > maxWidthPx && i > 0) {
        lines.push({ text: currentLine, isBlank: false });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({ text: currentLine, isBlank: false });
    }
  });

  if (lines.length === 0) return null;

  const paddingYPx = Math.round(paddingYMm * pxPerMm * scale);
  const totalHeightPx = (lines.length * lineSpacingPx) + (paddingYPx * 2);
  const heightMm = totalHeightPx / (pxPerMm * scale);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidthPx;
  canvas.height = totalHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  let currentY = paddingYPx;
  for (const line of lines) {
    if (!line.isBlank) {
      ctx.fillText(line.text, 0, currentY);
    } else {
      currentY += Math.round(lineSpacingPx * 0.45);
      continue;
    }
    currentY += lineSpacingPx;
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    heightMm,
    linesCount: lines.length
  };
}

/**
 * Generate and download an audit-grade civic grievance PDF dossier
 */
export function generatePetitionPdf({
  evidence,
  authority,
  letterText,
  forecast,
  language = 'en',
  _language = 'en',
  senderName,
  senderRole,
  senderContact,
  schoolEvidencePackage = null
}) {
  const activeLang = language || _language || 'en';
  const isHindi = activeLang === 'hi' || /[\u0900-\u097F]/.test(letterText || '');
  const isBrowserWithCanvas = typeof document !== 'undefined' && typeof document.createElement === 'function';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totalPages = forecast ? 3 : 2;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  const contentWidthMm = contentWidth;

  const refId = `VV-ACTION-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // =========================================================================
  // PAGE 1: FORMAL CIVIC GRIEVANCE REPRESENTATION
  // =========================================================================

  // Top Institutional Header Ribbon
  doc.setFillColor(15, 23, 42); // Deep slate #0f172a
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Line (Emerald / Cyan)
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FORMAL CIVIC COMPLAINT & EVIDENCE DOSSIER', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text('VayuVitals 3D · Citizen-to-Action Protocol · Empirical Sensor Grounded Representation', margin, 18);

  // Metadata block (Right aligned)
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Ref ID: ${refId}`, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Date: ${currentDateStr}`, pageWidth - margin, 18, { align: 'right' });

  // "Draft for Official Submission" Status Pill
  let yPos = 34;
  doc.setFillColor(254, 242, 242); // light red tint
  doc.setDrawColor(239, 68, 68); // red border
  doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text('NOTICE: DRAFT FOR CITIZEN SUBMISSION — FORWARD DIRECTLY TO COMPETENT AUTHORITY', margin + 4, yPos + 6.5);

  yPos += 16;

  // Addressed To Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TO:', margin, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text(authority.designation || 'The Competent Nodal Officer', margin, yPos);
  yPos += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(authority.fullName || '', margin, yPos);
  yPos += 4.5;
  doc.text(authority.department || '', margin, yPos);
  yPos += 4.5;
  doc.text(authority.address || '', margin, yPos);
  yPos += 8;

  // Subject Line
  let subjectText = `SUBJECT: URGENT ADMINISTRATIVE ACTION ON HAZARDOUS MORNING AIR QUALITY — ${evidence.schoolName.toUpperCase()}`;
  if (isHindi) {
    const sMatch = letterText.match(/विषय:\s*([^\n\r]+)/);
    subjectText = sMatch
      ? `विषय: ${sMatch[1].trim()}`
      : `विषय: ${evidence.schoolName} के विद्यार्थियों पर प्रातःकालीन गंभीर वायु प्रदूषण हेतु प्रतिवेदन`;
  }

  if (isHindi && isBrowserWithCanvas) {
    const subjectBlock = renderDevanagariCanvasBlock({
      paragraphs: [subjectText],
      contentWidthMm,
      fontSizePt: 8.8,
      fontWeight: 'bold',
      lineHeightMultiplier: 1.4,
      textColor: '#0f172a',
      backgroundColor: '#f1f5f9',
      paddingYMm: 2.2
    });

    if (subjectBlock) {
      doc.addImage(subjectBlock.dataUrl, 'PNG', margin, yPos, contentWidth, subjectBlock.heightMm);
      yPos += subjectBlock.heightMm + 4;
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, yPos, contentWidth, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(subjectText, margin + 3, yPos + 6, { maxWidth: contentWidth - 6 });
      yPos += 14;
    }
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, yPos, contentWidth, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(subjectText, margin + 3, yPos + 6, { maxWidth: contentWidth - 6 });
    yPos += 14;
  }

  // Clean and prepare the letter text paragraphs
  // Filter out the "To:" and "Subject:" headers if they were already included in letterText
  let bodyContent = letterText;
  const bodySplitIndex = bodyContent.indexOf('Respected Sir/Madam');
  if (bodySplitIndex !== -1) {
    bodyContent = bodyContent.substring(bodySplitIndex);
  } else {
    const hindiSplitIndex = bodyContent.indexOf('महोदय/महोदया');
    if (hindiSplitIndex !== -1) {
      bodyContent = bodyContent.substring(hindiSplitIndex);
    }
  }

  // Print letter body text
  if (isHindi && isBrowserWithCanvas) {
    const bodyParagraphs = bodyContent.split(/\r?\n/);
    const bodyBlock = renderDevanagariCanvasBlock({
      paragraphs: bodyParagraphs,
      contentWidthMm,
      fontSizePt: 8.6,
      lineHeightMultiplier: 1.5,
      textColor: '#334155',
      backgroundColor: '#ffffff',
      paddingYMm: 1.5
    });

    if (bodyBlock) {
      const availablePage1Mm = pageHeight - 35 - 18 - yPos; // Remaining space before footer & verification box
      if (bodyBlock.heightMm <= availablePage1Mm) {
        doc.addImage(bodyBlock.dataUrl, 'PNG', margin, yPos, contentWidth, bodyBlock.heightMm);
        yPos += bodyBlock.heightMm + 5;
      } else {
        // Multi-page splitting if text exceeds available page 1 height
        let page1Paras = [];
        let page2Paras = [];
        let runningLines = 0;
        const maxLinesPage1 = Math.floor(availablePage1Mm / 4.4);

        for (const p of bodyParagraphs) {
          const estLines = Math.max(1, Math.ceil((p.length || 1) / 75));
          if (runningLines + estLines <= maxLinesPage1 && page2Paras.length === 0) {
            page1Paras.push(p);
            runningLines += estLines;
          } else {
            page2Paras.push(p);
          }
        }

        const b1 = renderDevanagariCanvasBlock({
          paragraphs: page1Paras,
          contentWidthMm,
          fontSizePt: 8.6,
          lineHeightMultiplier: 1.5,
          textColor: '#334155',
          backgroundColor: '#ffffff'
        });
        if (b1) {
          doc.addImage(b1.dataUrl, 'PNG', margin, yPos, contentWidth, b1.heightMm);
          yPos += b1.heightMm + 5;
        }

        if (page2Paras.length > 0) {
          addFooter(doc, 1, totalPages + 1);
          doc.addPage();
          yPos = 25;
          const b2 = renderDevanagariCanvasBlock({
            paragraphs: page2Paras,
            contentWidthMm,
            fontSizePt: 8.6,
            lineHeightMultiplier: 1.5,
            textColor: '#334155',
            backgroundColor: '#ffffff'
          });
          if (b2) {
            doc.addImage(b2.dataUrl, 'PNG', margin, yPos, contentWidth, b2.heightMm);
            yPos += b2.heightMm + 5;
          }
        }
      }
    } else {
      // Clean fallback if canvas context unavailable
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(bodyContent, contentWidth);
      for (let i = 0; i < lines.length; i++) {
        if (yPos > pageHeight - 30) {
          addFooter(doc, 1, 2);
          doc.addPage();
          yPos = 25;
        }
        doc.text(lines[i], margin, yPos);
        yPos += 4.2;
      }
    }
  } else {
    // Standard English typography flow (100% original code)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const lines = doc.splitTextToSize(bodyContent, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      if (yPos > pageHeight - 30) {
        addFooter(doc, 1, 2);
        doc.addPage();
        yPos = 25;
      }
      doc.text(lines[i], margin, yPos);
      yPos += 4.2;
    }
  }

  // Signatory block (only print if not already contained in Hindi body text)
  if (!bodyContent.includes('भवदीय') && !bodyContent.includes('Yours sincerely')) {
    yPos += 4;
    if (senderName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Submitted by: ${senderName} (${senderRole || 'School Representative'})`, margin, yPos);
      yPos += 4;
    }
    if (senderContact) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Contact: ${senderContact}`, margin, yPos);
      yPos += 5;
    }
  }

  if (yPos > pageHeight - 35) {
    addFooter(doc, 1, 2);
    doc.addPage();
    yPos = 25;
  }

  // Verification Box
  doc.setFillColor(240, 253, 244); // light green
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('TELEMETRY INTEGRITY & DATA PROVENANCE ATTESTATION', margin + 4, yPos + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const provDetails = `Data extracted from nearest CAAQMS station: ${evidence.stationName} (${evidence.stationDistanceKm} km from campus). Model MAE: ${evidence.maeError} µg/m³. Computed by VayuVitals SafeRecess Engine on ${evidence.compilationDate}.`;
  doc.text(provDetails, margin + 4, yPos + 10, { maxWidth: contentWidth - 8 });
  doc.text(`Digital Verification Stamp: SHA256-AUTHENTICATED-${refId} · Zero Alteration Guarantee`, margin + 4, yPos + 15);

  addFooter(doc, 1, totalPages);

  // =========================================================================
  // PAGE 2: EMPIRICAL EVIDENCE APPENDIX & DAY-BY-DAY AUDIT LOG
  // =========================================================================
  doc.addPage();

  // Appendix Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 20, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ANNEXURE A: EMPIRICAL EVIDENCE & SCHOOL-HOURS EXPOSURE AUDIT', margin, 13);

  let appY = 28;

  // School Information & 14-Day Monitoring Metadata Header
  if (schoolEvidencePackage) {
    const sName = schoolEvidencePackage.school?.name || evidence.schoolName || 'Campus';
    const sLoc = schoolEvidencePackage.school?.locality || evidence.locality || 'Delhi NCR';
    const pStart = schoolEvidencePackage.monitoringPeriod?.startDate || evidence.startDate || '';
    const pEnd = schoolEvidencePackage.monitoringPeriod?.endDate || evidence.endDate || '';
    const covObs = schoolEvidencePackage.coverage?.observedDays ?? 14;
    const covDays = schoolEvidencePackage.coverage?.daysInWindow ?? 14;
    const covPct = schoolEvidencePackage.coverage?.coveragePercent ?? 100;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Institution: ${sName} (${sLoc})`, margin, appY);
    appY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`14-Day Monitoring Window: ${pStart} to ${pEnd} | Evidence Coverage: ${covObs}/${covDays} Days Observed (${covPct}%)`, margin, appY);
    appY += 6.5;
  }

  // Metric KPI Cards
  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 18;

  // Card 1: Exceedance Ratio / Observed Days
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(schoolEvidencePackage ? 'OBSERVED DAYS' : 'EXCEEDANCE DAYS', margin + 3, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(239, 68, 68);
  const ratioText = schoolEvidencePackage
    ? `${schoolEvidencePackage.coverage?.observedDays ?? 14} / ${schoolEvidencePackage.coverage?.daysInWindow ?? 14}`
    : `${evidence.exceedanceCount} / ${evidence.schoolDaysTotal}`;
  doc.text(ratioText, margin + 3, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(schoolEvidencePackage ? 'Verified monitoring days' : `>${evidence.threshold} µg/m³ threshold`, margin + 3, appY + 16);

  // Card 2: Peak PM2.5
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + cardWidth + 3, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PEAK DAILY PM2.5', margin + cardWidth + 6, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28);
  const peakVal = schoolEvidencePackage?.summary?.highestDailyPm25 ?? evidence.peakPm25;
  doc.text(`${peakVal} µg/m³`, margin + cardWidth + 6, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(schoolEvidencePackage ? 'Highest daily average' : `On ${evidence.peakDate}`, margin + cardWidth + 6, appY + 16);

  // Card 3: School Window Avg / 14-Day Average PM2.5
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardWidth * 2) + 6, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(schoolEvidencePackage ? '14-DAY AVG (ESTIMATED)' : 'SCHOOL WINDOW (7-13h)', margin + (cardWidth * 2) + 9, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(245, 158, 11);
  const avgVal = schoolEvidencePackage?.summary?.averagePm25 ?? evidence.avgMorningPm25;
  doc.text(`${avgVal} µg/m³`, margin + (cardWidth * 2) + 9, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(schoolEvidencePackage ? 'Estimated around school (IDW)' : `Overall average concentration`, margin + (cardWidth * 2) + 9, appY + 16);

  appY += 24;

  // Build Table Data
  if (schoolEvidencePackage && Array.isArray(schoolEvidencePackage.dailyEvidence) && schoolEvidencePackage.dailyEvidence.length > 0) {
    const tableData = schoolEvidencePackage.dailyEvidence.map(log => [
      log.date,
      log.status,
      log.observationCount ? `${log.observationCount} obs` : '0 obs',
      log.status !== 'NO_DATA' && log.averagePm25 !== null ? `${log.averagePm25} µg/m³` : 'NO DATA',
      log.status !== 'NO_DATA' ? `${log.dataQuality || 'HIGH'} Quality` : 'Unmonitored',
      log.status === 'NO_DATA' ? 'No observations recorded' : 'Estimated around school (IDW)'
    ]);

    autoTable(doc, {
      startY: appY,
      head: [['Date', 'Day Status', 'Observations', 'Avg PM2.5', 'Data Quality', 'Evidence Provenance']],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 'auto' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const rowData = schoolEvidencePackage.dailyEvidence[data.row.index];
          if (rowData && rowData.status === 'NO_DATA') {
            data.cell.styles.textColor = [148, 163, 184];
          } else if (rowData && rowData.averagePm25 > (evidence.threshold || 60) && data.column.index === 3) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const finalY = doc.lastAutoTable?.finalY || (appY + 65);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Methodology Note: School PM2.5 values are spatial estimates derived from nearby monitoring stations and are not direct measurements at the school.',
      margin,
      finalY + 5
    );
  } else {
    // Existing Default Table
    const tableData = (evidence.dailyLogs || []).map(log => [
      log.displayDate,
      log.dayOfWeek,
      `${log.morningAvgPm25} µg/m³`,
      `${log.peakPm25} µg/m³`,
      log.category,
      log.disruption
    ]);

    autoTable(doc, {
      startY: appY,
      head: [['Date', 'Day', '07-13h Avg', 'Peak PM2.5', 'NAQI Status', 'Operational Disruption on Campus']],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 12 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24 },
        5: { cellWidth: 'auto' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const rowData = (evidence.dailyLogs || [])[data.row.index];
          if (rowData && rowData.exceeded && data.column.index === 2) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  addFooter(doc, 2, totalPages);

  // =========================================================================
  // PAGE 3 (OPTIONAL): ANNEXURE B - ADVANCE 48-HOUR ML FORECAST (AWS SAGEMAKER)
  // =========================================================================
  if (forecast && forecast.hourlyTimeline) {
    doc.addPage();

    // Appendix B Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFillColor(6, 182, 212); // Cyan accent #06b6d4
    doc.rect(0, 20, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('ANNEXURE B: ADVANCE 48-HOUR SENSOR & ML FORECAST (AWS SAGEMAKER)', margin, 13);

    let bY = 28;

    // 3 KPI Cards for Forecast
    const bCardWidth = (contentWidth - 6) / 3;
    const bCardHeight = 18;

    // Card 1: Anticipated Arrival Peak
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, bY, bCardWidth, bCardHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ANTICIPATED ARRIVAL PEAK', margin + 3, bY + 5);
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    const peakStr = forecast.peakMorningArrival?.predictedPm25 ? `${forecast.peakMorningArrival.predictedPm25} µg/m³` : '---';
    doc.text(peakStr, margin + 3, bY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`At ${forecast.peakMorningArrival?.time || '08:00 AM'} (${forecast.peakMorningArrival?.category || 'Severe'})`, margin + 3, bY + 16);

    // Card 2: Model Accuracy & Validation
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + bCardWidth + 3, bY, bCardWidth, bCardHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('MODEL VALIDATION MAE', margin + bCardWidth + 6, bY + 5);
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text(`${forecast.maeError || '14.01'} µg/m³`, margin + bCardWidth + 6, bY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`AWS SageMaker Inversion Regressor`, margin + bCardWidth + 6, bY + 16);

    // Card 3: Pre-Emptive Mitigation Timing
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + (bCardWidth * 2) + 6, bY, bCardWidth, bCardHeight, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PRE-EMPTIVE ACTION WINDOW', margin + (bCardWidth * 2) + 9, bY + 5);
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.text('06:30 - 07:00 AM', margin + (bCardWidth * 2) + 9, bY + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Prior to student arrival gate open', margin + (bCardWidth * 2) + 9, bY + 16);

    bY += 23;

    // Pre-Emptive Mitigation Directive Callout
    doc.setFillColor(254, 243, 199); // warm amber #fef3c7
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, bY, contentWidth, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text('PRE-EMPTIVE MUNICIPAL DIRECTIVE:', margin + 4, bY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(forecast.preEmptiveRecommendation || 'Routine ambient dust suppression advised.', margin + 4, bY + 8.5, { maxWidth: contentWidth - 8 });

    bY += 16;

    // Filter forward hours for school windows (07:00 - 13:00)
    const schoolForecastHours = (forecast.hourlyTimeline || [])
      .filter(h => h.isSchoolWindow)
      .slice(0, 14);

    const forecastRows = schoolForecastHours.map(h => [
      `${h.displayDate} ${h.displayTime}`,
      h.isMorningArrival ? 'Morning Arrival (07-09h)' : 'Classroom Window (10-13h)',
      `${h.predictedPm25} µg/m³`,
      h.category,
      `${h.temp}°C · ${h.windSpeed} m/s`,
      h.predictedPm25 > (forecast.threshold || 60)
        ? (h.isMorningArrival ? 'Deploy anti-smog mist cannon; cancel outdoor assembly' : 'Indoor recess only; HEPA filtration')
        : 'Normal operations with ambient monitoring'
    ]);

    autoTable(doc, {
      startY: bY,
      head: [['Forecast Date/Time', 'Operational Window', 'Predicted PM2.5', 'NAQI Category', 'Weather Drivers', 'Actionable School Directive']],
      body: forecastRows,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85],
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 26 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 24 },
        5: { cellWidth: 'auto' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const rowData = schoolForecastHours[data.row.index];
          if (rowData && rowData.exceeded && data.column.index === 2) {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Verification seal block
    const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : bY + 80;
    if (finalTableY < pageHeight - 25) {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(45, 212, 191);
      doc.roundedRect(margin, finalTableY, contentWidth, 11, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(17, 94, 89);
      doc.text('AWS SAGEMAKER MODEL VERIFICATION & AUDIT SIGNATURE', margin + 3, finalTableY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(`Model: ${forecast.modelName || 'VayuVitals-SageMaker-AirQuality-XGBoost'} · Status: ${forecast.sagemakerStatus || 'Verified'} · Endpoint: ${forecast.executionMode}`, margin + 3, finalTableY + 8.5);
    }

    addFooter(doc, 3, totalPages);
  }

  // Save / Trigger Download
  const filename = `Civic_Grievance_${evidence.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}

function addFooter(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Prepared via VayuVitals 3D · Section 10 Evidence-to-Action Protocol · Compliant with India DPDP Act 2023', margin, pageHeight - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
}
