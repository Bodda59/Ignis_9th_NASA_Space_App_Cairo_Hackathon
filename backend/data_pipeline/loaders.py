import csv
from dataclasses import dataclass, field
from pathlib import Path

from pypdf import PdfReader


@dataclass
class SourceUnit:
    text: str
    location: dict
    row_data: dict | None = None


@dataclass
class LoadedFile:
    units: list[SourceUnit]
    warnings: list[str] = field(default_factory=list)


def load_file(path: Path) -> LoadedFile:
    path = Path(path)
    if path.suffix.lower() not in {'.pdf', '.txt', '.csv'}:
        raise ValueError('Supported files: PDF, UTF-8 TXT, and UTF-8 CSV. Convert DOCX/PPTX to TXT first.')
    if not path.is_file() or path.stat().st_size > 100 * 1024 * 1024:
        raise ValueError('File must exist and be at most 100 MiB.')
    units, warnings = [], []
    if path.suffix.lower() == '.pdf':
        reader = PdfReader(path)
        if reader.is_encrypted or len(reader.pages) > 500:
            raise ValueError('PDF must be unencrypted and at most 500 pages.')
        for page_number, page in enumerate(reader.pages, 1):
            text = page.extract_text(extraction_mode='layout') or ''
            if text.strip():
                units.append(SourceUnit(text, {'page': page_number}))
            else:
                warnings.append(f'PDF page {page_number} has no extractable text; blank or scanned content needs review.')
    elif path.suffix.lower() == '.txt':
        text = path.read_text(encoding='utf-8-sig')
        if text.strip():
            units.append(SourceUnit(text, {'line_start': 1, 'line_end': len(text.splitlines())}))
    else:
        with path.open(encoding='utf-8-sig', newline='') as handle:
            reader = csv.reader(handle, strict=True)
            headers = next(reader, [])
            if not headers or any(not x.strip() for x in headers) or len({x.strip().casefold() for x in headers}) != len(headers):
                raise ValueError('CSV needs nonblank, unique column headers.')
            for number, values in enumerate(reader, 1):
                if not values or not any(x.strip() for x in values):
                    continue
                if len(values) != len(headers) or number > 100000:
                    raise ValueError(f'CSV record {number} has an invalid width or exceeds the record limit.')
                row = dict(zip(headers, values))
                text = '\n'.join(f'{key}: {value if value != "" else "[not reported]"}' for key, value in row.items())
                units.append(SourceUnit(text, {'csv_record': number, 'physical_line_end': reader.line_num}, row))
    if not units:
        raise ValueError('No extractable text or data records. Scanned PDFs need OCR before ingestion.')
    return LoadedFile(units, warnings)
