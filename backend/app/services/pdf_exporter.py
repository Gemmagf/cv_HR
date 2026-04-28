"""
Mòdul C — Exportació de la proposta al client en PDF professional
Genera un PDF amb els candidats seleccionats, puntuacions i gràfiques
"""

from typing import List
from io import BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app.services.matching_engine import ResultatMatching


# Paleta corporativa CV Hunter
COLOR_PRIMARY    = colors.HexColor("#1A237E")   # blau fosc
COLOR_SECONDARY  = colors.HexColor("#3949AB")   # blau mig
COLOR_ACCENT     = colors.HexColor("#00ACC1")   # cian
COLOR_SUCCESS    = colors.HexColor("#43A047")   # verd
COLOR_WARNING    = colors.HexColor("#FB8C00")   # taronja
COLOR_LIGHT_BG   = colors.HexColor("#F5F7FF")   # fons molt clar
COLOR_TEXT       = colors.HexColor("#212121")
COLOR_TEXT_LIGHT = colors.HexColor("#757575")


def puntuacio_color(punt: float) -> colors.Color:
    if punt >= 80:
        return COLOR_SUCCESS
    if punt >= 60:
        return COLOR_ACCENT
    if punt >= 40:
        return COLOR_WARNING
    return colors.HexColor("#E53935")


def barra_progrés(punt: float, amplada: float = 5 * cm, altura: float = 0.35 * cm) -> Table:
    """Genera una taula visual que simula una barra de progrés"""
    ple = max(0.01, punt / 100) * amplada
    buit = amplada - ple
    col = puntuacio_color(punt)
    data = [[""]]
    taula = Table([[""]], colWidths=[ple], rowHeights=[altura])
    taula.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), col),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.lightgrey),
    ]))
    return taula


def generar_pdf_proposta(
    candidats: List[ResultatMatching],
    titol_encarrec: str,
    nom_client: str,
    nom_empresa_rrhh: str = "CV Hunter",
) -> bytes:
    """Genera el PDF de proposta professional per al client"""

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
        title=f"Proposta de candidats — {titol_encarrec}",
    )

    styles = getSampleStyleSheet()
    estil_titol = ParagraphStyle(
        "titol", fontSize=22, textColor=COLOR_PRIMARY,
        fontName="Helvetica-Bold", spaceAfter=6, alignment=TA_CENTER,
    )
    estil_subtitol = ParagraphStyle(
        "subtitol", fontSize=13, textColor=COLOR_SECONDARY,
        fontName="Helvetica", spaceAfter=4, alignment=TA_CENTER,
    )
    estil_seccio = ParagraphStyle(
        "seccio", fontSize=12, textColor=COLOR_PRIMARY,
        fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4,
    )
    estil_nom = ParagraphStyle(
        "nom", fontSize=14, textColor=COLOR_PRIMARY,
        fontName="Helvetica-Bold", spaceAfter=2,
    )
    estil_cos = ParagraphStyle(
        "cos", fontSize=9, textColor=COLOR_TEXT,
        fontName="Helvetica", spaceAfter=3, leading=14,
    )
    estil_peu = ParagraphStyle(
        "peu", fontSize=7, textColor=COLOR_TEXT_LIGHT,
        fontName="Helvetica", alignment=TA_CENTER,
    )

    contingut = []

    # --- Capçalera ---
    contingut.append(Spacer(1, 0.5 * cm))
    contingut.append(Paragraph(nom_empresa_rrhh, estil_subtitol))
    contingut.append(Paragraph(f"Proposta de Candidats", estil_titol))
    contingut.append(Paragraph(f"{titol_encarrec} · {nom_client}", estil_subtitol))
    contingut.append(Spacer(1, 0.3 * cm))
    contingut.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARY))
    contingut.append(Spacer(1, 0.3 * cm))

    data_generacio = datetime.now().strftime("%d/%m/%Y %H:%M")
    contingut.append(Paragraph(
        f"Generat el {data_generacio} · {len(candidats)} candidat{'s' if len(candidats) != 1 else ''} seleccionat{'s' if len(candidats) != 1 else ''}",
        estil_peu,
    ))
    contingut.append(Spacer(1, 0.8 * cm))

    # --- Candidats ---
    for i, cand in enumerate(candidats, 1):
        contingut.append(Paragraph(f"SECCIÓ {i}", estil_seccio))

        # Capçalera candidat
        info_exp = f"{cand.ultima_posicio or '—'} · {cand.ultima_empresa or '—'}"
        anys = f"{cand.anys_exp_total:.0f} anys exp." if cand.anys_exp_total else "Exp. no especificada"
        contingut.append(Paragraph(f"{i}. {cand.nom}", estil_nom))
        contingut.append(Paragraph(f"{info_exp} | {anys} | {cand.ubicacio or '—'}", estil_cos))

        # Puntuació global
        contingut.append(Spacer(1, 0.2 * cm))
        col_global = puntuacio_color(cand.puntuacio_global)
        dades_global = [[
            Paragraph("Puntuació Global", estil_cos),
            Paragraph(
                f'<font color="#{col_global.hexval()[1:]}"><b>{cand.puntuacio_global:.1f}%</b></font>',
                ParagraphStyle("pct", fontSize=14, fontName="Helvetica-Bold", textColor=col_global)
            ),
        ]]
        taula_global = Table(dades_global, colWidths=[8 * cm, 3 * cm])
        taula_global.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_BG),
            ("ROWPADDING", (0, 0), (-1, -1), 6),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        contingut.append(taula_global)
        contingut.append(Spacer(1, 0.3 * cm))

        # Puntuacions per dimensió
        dimensions = [
            ("Habilitats tècniques", cand.puntuacio_habilitats),
            ("Experiència",          cand.puntuacio_experiencia),
            ("Formació",             cand.puntuacio_formacio),
            ("Idiomes",              cand.puntuacio_idiomes),
            ("Ubicació / Mobilitat", cand.puntuacio_ubicacio),
        ]
        dades_dim = []
        for nom_dim, punt in dimensions:
            col_dim = puntuacio_color(punt)
            dades_dim.append([
                Paragraph(nom_dim, estil_cos),
                Paragraph(f"{punt:.0f}%", ParagraphStyle(
                    "pctdim", fontSize=9, fontName="Helvetica-Bold",
                    textColor=col_dim, alignment=TA_RIGHT,
                )),
            ])

        taula_dim = Table(dades_dim, colWidths=[9 * cm, 2 * cm])
        taula_dim.setStyle(TableStyle([
            ("ROWPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        contingut.append(taula_dim)
        contingut.append(Spacer(1, 0.3 * cm))

        # Fortaleses i resum
        if cand.fortaleses_top3:
            fortaleses_text = " · ".join(cand.fortaleses_top3)
            contingut.append(Paragraph(f"<b>Top 3 fortaleses:</b> {fortaleses_text}", estil_cos))

        if cand.resum_ia:
            contingut.append(Spacer(1, 0.2 * cm))
            contingut.append(Paragraph(f"<i>{cand.resum_ia}</i>", estil_cos))

        contingut.append(Spacer(1, 0.3 * cm))
        contingut.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
        contingut.append(Spacer(1, 0.5 * cm))

    # --- Peu de pàgina ---
    contingut.append(Spacer(1, 1 * cm))
    contingut.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY))
    contingut.append(Spacer(1, 0.2 * cm))
    contingut.append(Paragraph(
        f"Document generat per {nom_empresa_rrhh} · CV Hunter v1.0 · Massiu Soft SL · Distribució confidencial",
        estil_peu,
    ))

    doc.build(contingut)
    return buffer.getvalue()
