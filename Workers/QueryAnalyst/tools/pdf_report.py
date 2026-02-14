from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    ListFlowable,
    ListItem,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.units import inch
from configs.config import Config


def generate_pdf_from_markdown(markdown_text: str, output_path: str = None) -> str:
    if output_path is None:
        output_path = Config.pdf_path()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # ---------------- STYLES ----------------
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=18,
        spaceAfter=20
    )

    heading_style = ParagraphStyle(
        "HeadingStyle",
        parent=styles["Heading2"],
        fontSize=13,
        spaceBefore=12,
        spaceAfter=8
    )

    subheading_style = ParagraphStyle(
        "SubHeadingStyle",
        parent=styles["Heading3"],
        fontSize=12,
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontSize=11,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=10
    )

    story = []

    # ---------------- CONTENT PARSING ----------------
    lines = markdown_text.split("\n")
    i = 0
    bullet_buffer = []

    def flush_bullets():
        nonlocal bullet_buffer
        if bullet_buffer:
            items = [
                ListItem(Paragraph(text, body_style))
                for text in bullet_buffer
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    leftIndent=20,
                )
            )
            bullet_buffer = []

    while i < len(lines):
        raw_line = lines[i]
        line = raw_line.strip()

        # Blank line -> end of paragraphs/lists
        if not line:
            flush_bullets()
            story.append(Spacer(1, 8))
            i += 1
            continue

        # Setext-style headings (Markdown underline with ===== or -----)
        if i + 1 < len(lines):
            underline = lines[i + 1].strip()
            if underline and set(underline) <= {"="}:
                flush_bullets()
                story.append(Paragraph(line, title_style))
                i += 2
                continue
            if underline and set(underline) <= {"-"}:
                flush_bullets()
                story.append(Paragraph(line, heading_style))
                i += 2
                continue

        # ATX-style headings
        if line.startswith("# "):
            flush_bullets()
            story.append(Paragraph(line[2:], title_style))
        elif line.startswith("## "):
            flush_bullets()
            story.append(Paragraph(line[3:], heading_style))
        elif line.startswith("### "):
            flush_bullets()
            story.append(Paragraph(line[4:], subheading_style))
        # Bullet lists
        elif line.startswith("* ") or line.startswith("- "):
            bullet_text = line[2:]
            bullet_buffer.append(bullet_text)
        # Normal paragraph text
        else:
            flush_bullets()
            story.append(Paragraph(line, body_style))

        i += 1

    # Flush any remaining bullets at end of document
    flush_bullets()

    doc.build(story)
    return output_path