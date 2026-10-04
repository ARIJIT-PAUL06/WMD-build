import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PDF = os.path.join(BASE_DIR, '..', 'public', 'model_training_specifications.pdf')
METADATA_FILE = os.path.join(BASE_DIR, 'model', 'sagemaker_model_metadata.json')

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0284c7"))
        self.drawString(54, letter[1] - 36, "VAYUVITALS · CLEAN AIR & INSTITUTIONAL HEALTH NETWORK")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(letter[0] - 54, letter[1] - 36, "ATMOSPHERIC PREDICTIVE ML ENGINE SPECIFICATION")

        # Top rule
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Bottom rule
        self.line(54, 46, letter[0] - 54, 46)
        self.setFont("Helvetica", 8)
        self.drawString(54, 34, "CONFIDENTIAL · INSTITUTIONAL HEALTH & POLLUTION MITIGATION INTELLIGENCE")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 34, page_text)
        self.restoreState()

def generate_pdf():
    os.makedirs(os.path.dirname(OUTPUT_PDF), exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=10,
        spaceAfter=5
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=6,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=5
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f8fafc"),
        borderPadding=5,
        spaceBefore=3,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'Callout_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#0369a1")
    )

    story = []

    # Title block
    story.append(Spacer(1, 4))
    story.append(Paragraph("VayuVitals Cascading Multi-Horizon Atmospheric Predictive Engine", title_style))
    story.append(Paragraph("Mathematical Architecture, High-Order Atmospheric Physics, Adaptive Kalman Assimilation, and Empirical Validation on Delhi-NCR CPCB Continuous Network", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=8))

    # Executive Overview
    story.append(Paragraph("1. Executive Summary & Model Identity", h1_style))
    summary_text = (
        "This specification documents the predictive machine learning engine integrated into the <b>VayuVitals</b> institutional "
        "health and clean air platform. Built upon continuous telemetry from the xKDR Forum CPCB regulatory monitoring network across Delhi-NCR "
        "(56,985 training observations and 14,247 held-out validation samples), the engine features a <b>Cascading Horizon Ensemble Ladder</b>, "
        "24 high-order atmospheric physics features, <b>Log-Normal heteroscedastic target transformation</b>, and <b>Adaptive Kalman residual assimilation</b>. "
        "It provides empirical foresight for preemptive school closures, outdoor morning assembly restrictions, and institutional mitigation."
    )
    story.append(Paragraph(summary_text, body_style))

    # Identity Table
    id_data = [
        [Paragraph("<b>Model Name</b>", body_style), Paragraph("vayuvitals-delhi-ncr-xgboost-v2", code_style)],
        [Paragraph("<b>Engine Framework</b>", body_style), Paragraph("Cascading Multi-Horizon Log-Normal XGBoost with Online Kalman Assimilation", body_style)],
        [Paragraph("<b>S3 Artifact Path</b>", body_style), Paragraph("s3://vayuvitals-aqi-dataset/models/model.tar.gz", code_style)],
        [Paragraph("<b>Training / Test Data</b>", body_style), Paragraph("56,985 Training Hours (80%) | 14,247 Validation Hours (20%) — 71,232 Total Records", body_style)],
        [Paragraph("<b>1h Rapid Nowcast Accuracy</b>", body_style), Paragraph("<b>21.05 µg/m³ MAE</b> | R² = <b>0.8664</b> (Pearson r = 0.9308) | ±20 µg/m³: <b>67.2%</b>", body_style)],
        [Paragraph("<b>3h Morning Arrival Accuracy</b>", body_style), Paragraph("<b>29.29 µg/m³ MAE</b> | R² = <b>0.7936</b> (Pearson r = 0.8908) | ±20 µg/m³: <b>50.9%</b>", body_style)]
    ]
    t_id = Table(id_data, colWidths=[2.0 * inch, 5.0 * inch])
    t_id.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_id)
    story.append(Spacer(1, 8))

    # Algorithmic Architecture
    story.append(Paragraph("2. Mathematical Architecture: Log-Normal Target Transformation & Taylor Approximation", h1_style))
    algo_text = (
        "Atmospheric particulate concentrations exhibit strong positive skewness and multiplicative variance. To guarantee strictly positive "
        "predictions and stabilize heteroscedastic noise across seasons, the engine models the transformed variable <code>z = ln(1 + PM2.5)</code>. "
        "The objective function minimizes regularized squared loss in log-space:"
    )
    story.append(Paragraph(algo_text, body_style))

    # Formula Block
    f1 = (
        "Obj(theta) = sum L(z_i, z_hat_i) + sum [ gamma * T_k + 0.5 * lambda * sum (w_j)^2 + alpha * sum |w_j| ]<br/>"
        "where:  z_i = ln(1 + y_i),   z_hat_i = ln(1 + y_hat_i)<br/>"
        "• Taylor Expansion: Obj^(t) ≈ sum [ g_i * f_t(x_i) + 0.5 * h_i * (f_t(x_i))^2 ] + Omega(f_t)<br/>"
        "• Optimal Leaf Weights:  w_j* = - ( sum g_i ) / ( sum h_i + lambda )<br/>"
        "• Inverse Quantile Inversion:<br/>"
        "   - P50 (Median Expected): y_hat_50 = exp(z_hat) - 1<br/>"
        "   - P10 (Optimistic Dispersion): y_hat_10 = max(15, exp(z_hat - 1.28 * sigma_log) - 1)<br/>"
        "   - P90 (Critical Inversion Surge): y_hat_90 = exp(z_hat + 1.28 * sigma_log) - 1"
    )
    story.append(Paragraph(f1, code_style))

    # Kalman Assimilation
    story.append(Paragraph("<b>Adaptive Kalman Filter / Online Residual Error Assimilation:</b>", h2_style))
    kalman_text = (
        "To assimilate real-time hyper-local sensor telemetry without boundary discontinuity, the forward engine computes the "
        "initial observation innovation <code>residual_0 = Y_sensor(0) - Y_synoptic(0)</code> and exponentially relaxes it toward "
        "synoptic meteorological physics over an atmospheric decorrelation timescale (tau = 5.5 hours):"
    )
    story.append(Paragraph(kalman_text, body_style))
    f_kalman = (
        "delta_residual(t) = ( Y_sensor(0) - Y_synoptic(0) ) * exp( - t / tau_decorrelation )<br/>"
        "where tau_decorrelation = 5.5 hours (conforming to planetary boundary layer turnover in the Indo-Gangetic Plain)."
    )
    story.append(Paragraph(f_kalman, code_style))
    story.append(Spacer(1, 6))

    # Cascading Horizon Ensemble Ladder
    story.append(Paragraph("3. Cascading Horizon Ensemble Performance Ladder", h1_style))
    story.append(Paragraph("Empirical evaluation across 14,247 held-out validation hours demonstrates dramatic accuracy improvements for short lead times:", body_style))

    ladder_data = [
        [Paragraph("<b>Forecast Lead Horizon</b>", body_style), Paragraph("<b>Target Operation</b>", body_style), Paragraph("<b>MAE</b>", body_style), Paragraph("<b>RMSE</b>", body_style), Paragraph("<b>Pearson r</b>", body_style), Paragraph("<b>R² Score</b>", body_style), Paragraph("<b>±20 µg/m³ Acc</b>", body_style)],
        [Paragraph("t + 1h (Nowcast)", code_style), Paragraph("Emergency Recess & Bell Recall", body_style), Paragraph("<b>21.05 µg/m³</b>", body_style), Paragraph("46.86 µg/m³", body_style), Paragraph("0.9308", body_style), Paragraph("<b>86.6%</b>", body_style), Paragraph("<b>67.2%</b>", body_style)],
        [Paragraph("t + 3h (Arrival)", code_style), Paragraph("Morning School Bus & Transit", body_style), Paragraph("<b>29.29 µg/m³</b>", body_style), Paragraph("49.93 µg/m³", body_style), Paragraph("0.8908", body_style), Paragraph("<b>79.4%</b>", body_style), Paragraph("<b>50.9%</b>", body_style)],
        [Paragraph("t + 6h (Shift)", code_style), Paragraph("Institutional Handover & Sports", body_style), Paragraph("37.18 µg/m³", body_style), Paragraph("55.23 µg/m³", body_style), Paragraph("0.8332", body_style), Paragraph("69.4%", body_style), Paragraph("42.4%", body_style)],
        [Paragraph("t + 12h (Evening)", code_style), Paragraph("Evening Commute & Night Vent", body_style), Paragraph("43.54 µg/m³", body_style), Paragraph("63.01 µg/m³", body_style), Paragraph("0.7712", body_style), Paragraph("59.5%", body_style), Paragraph("37.3%", body_style)],
        [Paragraph("t + 24h (Day-Ahead)", code_style), Paragraph("Administrative Action & Closure", body_style), Paragraph("43.37 µg/m³", body_style), Paragraph("64.19 µg/m³", body_style), Paragraph("0.7625", body_style), Paragraph("58.2%", body_style), Paragraph("38.5%", body_style)]
    ]
    t_ladder = Table(ladder_data, colWidths=[1.4 * inch, 1.6 * inch, 0.8 * inch, 0.8 * inch, 0.7 * inch, 0.8 * inch, 0.9 * inch])
    t_ladder.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e0f2fe")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_ladder)
    story.append(Spacer(1, 8))

    # Page Break for Feature Vector & Atmospheric Physics
    story.append(PageBreak())

    story.append(Paragraph("4. High-Order Atmospheric Physics & Feature Vector (24 Dimensions)", h1_style))
    feat_text = (
        "The model ingests 24 engineered features capturing multi-scale atmospheric physics, chemical soot partitioning, and boundary layer dynamics:"
    )
    story.append(Paragraph(feat_text, body_style))

    feat_data = [
        [Paragraph("<b>Feature</b>", body_style), Paragraph("<b>Mathematical Formulation</b>", body_style), Paragraph("<b>Physics & Relative Importance</b>", body_style)],
        [Paragraph("soot_mass", code_style), Paragraph("PM2.5 × (PM2.5 / PM10)", code_style), Paragraph("<b>26.4% Importance (#1)</b>: Isolates fine combustion carbon/soot from mineral dust.", body_style)],
        [Paragraph("doy_cos", code_style), Paragraph("cos(2π · DayOfYear / 365.25)", code_style), Paragraph("<b>17.2% Importance (#2)</b>: Continuous macro-seasonal winter inversion depth.", body_style)],
        [Paragraph("pm25_now", code_style), Paragraph("Current observation (µg/m³)", code_style), Paragraph("<b>14.0% Importance (#3)</b>: High-frequency auto-regressive state anchor.", body_style)],
        [Paragraph("is_winter", code_style), Paragraph("Binary: Nov, Dec, Jan, late Oct", body_style), Paragraph("<b>12.7% Importance (#4)</b>: Severe thermal radiation inversion boundary flag.", body_style)],
        [Paragraph("doy_sin", code_style), Paragraph("sin(2π · DayOfYear / 365.25)", code_style), Paragraph("5.7% Importance: Monsoon washout and transition phase tracking.", body_style)],
        [Paragraph("pm25_lag_1 / lag_2", code_style), Paragraph("PM2.5(t-1), PM2.5(t-2)", code_style), Paragraph("7.0% Combined: Short-term atmospheric memory and autoregression.", body_style)],
        [Paragraph("is_stubble_burning", code_style), Paragraph("Binary: Oct 20 - Nov 20", body_style), Paragraph("4.2% Importance: Regional agrarian biomass burning smoke window.", body_style)],
        [Paragraph("momentum_24h", code_style), Paragraph("PM2.5(t) - PM2.5(t-24)", code_style), Paragraph("3.0% Importance: 24-hour diurnal drift and synoptic building trend.", body_style)],
        [Paragraph("acceleration_2h", code_style), Paragraph("(PM2.5(t) - PM2.5(t-1)) - (PM2.5(t-1) - PM2.5(t-2))", code_style), Paragraph("2.3% Importance: Second-derivative plume onset acceleration rate.", body_style)],
        [Paragraph("u_wind, v_wind", code_style), Paragraph("U = -S·sin(D), V = -S·cos(D)", code_style), Paragraph("Vector wind decomposition tracking North-Westerly smoke advection.", body_style)],
        [Paragraph("inversion_intensity", code_style), Paragraph("max(0, (24 - T)/10) × stagnation_mult", code_style), Paragraph("Quantifies cold nighttime ground inversion pollutant trapping capacity.", body_style)]
    ]
    t_feat = Table(feat_data, colWidths=[1.5 * inch, 2.5 * inch, 3.0 * inch])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_feat)
    story.append(Spacer(1, 8))

    # Institutional Health & Action Protocols
    story.append(Paragraph("5. Institutional Action & Civic Health Protocols", h1_style))
    proto_text = (
        "The model outputs feed directly into operational decision engines across Delhi-NCR schools, colleges, and healthcare centers:<br/>"
        "• <b>6:30 AM Pre-Commute Advisory:</b> Delivers morning arrival risk, hourly confidence bands (P10–P90), and chemical source fingerprint to principals before student transit begins.<br/>"
        "• <b>12:00 PM Mid-Day Emergency Alert:</b> Powered by Gemini AI, monitors sudden noon dust incursions and photochemistry to issue playground recall directives.<br/>"
        "• <b>14-Day Chronic Non-Compliance Legal Action:</b> Aggregates empirical sensor data and forward forecasts into signed petitions addressed to the Directorate of Education."
    )
    story.append(Paragraph(proto_text, body_style))
    story.append(Spacer(1, 8))

    # Architecture Callout
    callout_data = [[
        Paragraph(
            "<b>Institutional Deployment Note:</b> The VayuVitals engine operates with dual deployment parity: "
            "it is packaged as <code>model.tar.gz</code> in Amazon S3 for AWS SageMaker Serverless Inference and mirrored "
            "in the Node.js API server for resilient sub-millisecond local execution with continuous Kalman assimilation.",
            callout_style
        )
    ]]
    t_call = Table(callout_data, colWidths=[7.0 * inch])
    t_call.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0284c7")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_call)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Generated Model Specification PDF at: {OUTPUT_PDF}")

if __name__ == '__main__':
    generate_pdf()
