import math
import re

from data_pipeline.loaders import SourceUnit


def cosine(left, right):
    denominator = math.sqrt(sum(x*x for x in left) * sum(x*x for x in right))
    return sum(x*y for x, y in zip(left, right)) / denominator if denominator else 0.0


def semantic_chunks(units, embedder, max_tokens=384, percentile=85):
    """Split prose at adjacent-sentence meaning changes; preserve CSV row boundaries."""
    if not 8 <= max_tokens <= 480 or not 0 <= percentile <= 100:
        raise ValueError('Invalid chunk token budget or semantic percentile.')
    tokenizer, chunks = embedder.tokenizer, []
    for unit in units:
        if unit.row_data is not None:
            if len(tokenizer.encode(unit.text, add_special_tokens=False)) > max_tokens:
                raise ValueError(f'CSV record {unit.location["csv_record"]} exceeds the embedding token budget. Reduce columns or move long narratives to TXT; rows are never silently truncated.')
            chunks.append(unit)
            continue
        pieces = []
        # Blank lines preserve paragraph boundaries; sentence stops preserve topic shifts.
        for match in re.finditer(r'\S[\s\S]*?(?:(?<=[.!?])(?=\s+)|(?=\n\s*\n)|\Z)', unit.text):
            start, end = match.span()
            text = unit.text[start:end].rstrip()
            offsets = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)['offset_mapping']
            if not offsets:
                continue
            for i in range(0, len(offsets), max_tokens):
                first, last = offsets[i][0], offsets[min(i+max_tokens, len(offsets))-1][1]
                pieces.append((start+first, start+last, text[first:last]))
        if not pieces:
            continue
        vectors = embedder.embed_documents([x[2] for x in pieces]) if len(pieces) > 1 else []
        distances = [max(0.0, 1-cosine(a, b)) for a, b in zip(vectors, vectors[1:])]
        ordered = sorted(distances)
        position = (len(ordered)-1) * percentile/100
        lower = int(position) if ordered else 0
        cutoff = max(.15, ordered[lower] + (ordered[min(lower+1, len(ordered)-1)]-ordered[lower])*(position-lower)) if ordered else 1
        group = []

        def emit():
            if not group:
                return
            start, end = group[0][0], group[-1][1]
            location = dict(unit.location, char_start=start, char_end=end, chunk_method='semantic')
            if 'line_start' in unit.location:
                location['line_start'] = unit.location['line_start'] + unit.text[:start].count('\n')
                location['line_end'] = unit.location['line_start'] + unit.text[:end].count('\n')
            chunks.append(SourceUnit(' '.join(x[2] for x in group), location))

        for i, piece in enumerate(pieces):
            candidate = ' '.join(x[2] for x in group + [piece])
            too_long = len(tokenizer.encode(candidate, add_special_tokens=False)) > max_tokens
            meaning_changed = i > 0 and distances[i-1] >= cutoff
            if group and (meaning_changed or too_long):
                emit()
                group = []
            group.append(piece)
        emit()
    return chunks
