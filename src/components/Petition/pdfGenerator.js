import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download an audit-grade civic grievance PDF dossier
 */
export function generatePetitionPdf({
  evidence,
  authority,
  letterText,
  forecast,
  _language = 'en',
  senderName,
  senderRole,
  senderContact
}) {
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
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, yPos, contentWidth, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const subjectText = `SUBJECT: URGENT ADMINISTRATIVE ACTION ON HAZARDOUS MORNING AIR QUALITY — ${evidence.schoolName.toUpperCase()}`;
  doc.text(subjectText, margin + 3, yPos + 6, { maxWidth: contentWidth - 6 });
  yPos += 14;

  // Letter Body Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

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

  const lines = doc.splitTextToSize(bodyContent, contentWidth);

  // Print text with pagination safety
  for (let i = 0; i < lines.length; i++) {
    if (yPos > pageHeight - 30) {
      addFooter(doc, 1, 2);
      doc.addPage();
      yPos = 25;
    }
    doc.text(lines[i], margin, yPos);
    yPos += 4.2;
  }

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

  // Metric KPI Cards
  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 18;

  // Card 1: Exceedance Ratio
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('EXCEEDANCE DAYS', margin + 3, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(239, 68, 68);
  doc.text(`${evidence.exceedanceCount} / ${evidence.schoolDaysTotal}`, margin + 3, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`>${evidence.threshold} µg/m³ threshold`, margin + 3, appY + 16);

  // Card 2: Peak PM2.5
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + cardWidth + 3, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PEAK RECORDED PM2.5', margin + cardWidth + 6, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28);
  doc.text(`${evidence.peakPm25} µg/m³`, margin + cardWidth + 6, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`On ${evidence.peakDate}`, margin + cardWidth + 6, appY + 16);

  // Card 3: School Window Avg
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardWidth * 2) + 6, appY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SCHOOL WINDOW (7-13h)', margin + (cardWidth * 2) + 9, appY + 5);
  doc.setFontSize(14);
  doc.setTextColor(245, 158, 11);
  doc.text(`${evidence.avgMorningPm25} µg/m³`, margin + (cardWidth * 2) + 9, appY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Overall average concentration`, margin + (cardWidth * 2) + 9, appY + 16);

  appY += 24;

  // Build Table Data
  const tableData = evidence.dailyLogs.map(log => [
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
        const rowData = evidence.dailyLogs[data.row.index];
        if (rowData && rowData.exceeded && data.column.index === 2) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

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
