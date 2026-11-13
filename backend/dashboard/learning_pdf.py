"""Render a scoped evidence report with personal notes."""
from io import BytesIO
from urllib.parse import urlsplit
from xml.sax.saxutils import escape, quoteattr

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate

from dashboard.learning import source_label

AUDIENCE = {
    'professor': ('Teaching report', 'Ask learners to distinguish the investigation objective, the conditions tested, and the observations reported.'),
    'undergraduate': ('Guided study report', 'Explain one excerpt in your own words. Identify a measured variable and find its value or unit in the source.'),
    'graduate': ('Critical reading report', 'Identify the test conditions, measurement method, and limitations. Explain what evidence would be needed to compare this study with another.'),
}


def export_pdf(pack, notes=''):
    output = BytesIO()
    subtitle, exercise = AUDIENCE[pack['audience']]
    navy = colors.HexColor('#152a3c')
    teal = colors.HexColor('#0c625e')
    muted = colors.HexColor('#506273')
    styles = {
        'title': ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=23, leading=28,
                                textColor=navy, spaceAfter=10, keepWithNext=True, alignment=TA_LEFT),
        'heading': ParagraphStyle('Heading', fontName='Helvetica-Bold', fontSize=12, leading=16,
                                  textColor=teal, spaceBefore=14, spaceAfter=6, keepWithNext=True),
        'body': ParagraphStyle('Body', fontSize=10.5, leading=15, textColor=navy, spaceAfter=8),
        'meta': ParagraphStyle('Meta', fontSize=9, leading=13, textColor=muted, spaceAfter=8),
    }
    story = []

    def add(text, style='body'):
        safe = escape(text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-'))
        # Preserve common chemical and measurement notation with PDF font sub/superscripts.
        for chars, tag in [('₀₁₂₃₄₅₆₇₈₉', 'sub'), ('⁰¹²³⁴⁵⁶⁷⁸⁹', 'super')]:
            for digit, char in enumerate(chars):
                safe = safe.replace(char, f'<{tag}>{digit}</{tag}>')
        story.append(Paragraph(safe.replace('\n', '<br/>'), styles[style]))

    add(f"{pack['investigation_id']}  /  {subtitle}", 'meta')
    add(pack['title'], 'title')
    if pack['topic']:
        add(f"Topic focus: {pack['topic']}", 'meta')
    add('Reading activity', 'heading')
    add(exercise)
    if notes:
        add('Your notes', 'heading')
        add('Personal notes supplied for this download.', 'meta')
        for part in notes.split('\n\n'):
            if part.strip():
                add(part)
    add('Source excerpts' if pack['quality'].get('method') == 'source_excerpts' else 'Reviewed evidence', 'heading')
    numbers = {c['id']: i for i, c in enumerate(pack['citations'], 1)}
    for point in pack['points']:
        markers = ' '.join(f'[{numbers[key]}]' for key in point['citation_ids'])
        add(f"{markers} {point['text']}")
    if pack['limitations']:
        add('Evidence limits', 'heading')
        for item in pack['limitations']:
            add(item)
    add('Source references', 'heading')
    for i, citation in enumerate(pack['citations'], 1):
        label = escape(f'[{i}] {source_label(citation)}')
        url = citation.get('source_url') or ''
        if urlsplit(url).scheme in {'http', 'https'}:
            label += f' &nbsp; <link href={quoteattr(url)} color="#0c625e">Open source</link>'
        story.append(Paragraph(label, styles['meta']))

    def page_footer(canvas, doc):
        canvas.setStrokeColor(colors.HexColor('#d5e2e4'))
        canvas.line(doc.leftMargin, 40, A4[0] - doc.rightMargin, 40)
        canvas.setFillColor(muted)
        canvas.setFont('Helvetica', 9)
        canvas.drawString(doc.leftMargin, 26, f"Flame in Freefall  /  {pack['investigation_id']}")
        canvas.drawRightString(A4[0] - doc.rightMargin, 26, str(doc.page))

    document = SimpleDocTemplate(output, pagesize=A4, leftMargin=52, rightMargin=52,
                                 topMargin=46, bottomMargin=55, title=pack['title'])
    document.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    return output.getvalue()
