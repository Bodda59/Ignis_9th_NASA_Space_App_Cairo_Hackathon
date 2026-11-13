import re
from collections import defaultdict

from rank_bm25 import BM25Okapi


STOPWORDS = set(
    'a an the is are was were be of in on at by to and or for how what which who where when why '
    'does do did can could would should with about i you we they he she it me us my your our tell look looked investigate '
    'investigation investigations study studies studied'.split()
)
# Weak keyword evidence needs stronger cosine similarity before it can enter the ranking.
SEMANTIC_ONLY_MIN_SIMILARITY = 0.73


def tokens(text):
    return [x for x in re.findall(r'[a-z0-9]+(?:[-_][a-z0-9]+)*', text.casefold()) if x not in STOPWORDS]


def hybrid_search(question, corpus, semantic_results, min_similarity=.5, limit=30, per_study=False):
    if not corpus:
        return []
    # Repeated exports must not gain extra votes in either ranking branch.
    unique, seen, aliases = [], {}, {}
    for item in sorted(corpus, key=lambda x: x.id):
        key = (item.investigation_id, ' '.join(item.text.casefold().split()))
        if key not in seen:
            seen[key] = item.id
            unique.append(item)
        aliases[item.id] = seen[key]
    by_id = {x.id: x for x in unique}
    query = set(tokens(question))
    # A shared year or measurement by itself is weak evidence for a question.
    query = {term for term in query if not term.isdecimal()} or query
    if not query:
        return []
    texts = {x.id: f'{x.investigation_name} {x.investigation_id} {x.title} {x.text}' for x in unique}
    tokenized = {id: tokens(text) for id, text in texts.items()}
    bm25 = BM25Okapi([value or [''] for value in tokenized.values()])
    scores = dict(zip(tokenized, bm25.get_scores(sorted(query))))
    phrase = re.escape(question.casefold().strip())
    exact_pattern = re.compile(rf'(?<![\w-]){phrase}(?![\w-])')
    exact = {id: bool(exact_pattern.search(text.casefold())) for id, text in texts.items()}
    matched_terms = {id: query.intersection(words) for id, words in tokenized.items()}
    required_terms = (2 * len(query) + 2) // 3
    lexical = [id for id in by_id if exact[id] or len(matched_terms[id]) >= required_terms]
    lexical_ids = set(lexical)
    lexical.sort(key=lambda id: (-int(exact[id]), -scores.get(id, 0), id))
    semantic, used = [], set()
    similarities = {}
    for id, similarity in semantic_results:
        id = aliases.get(id, id)
        cutoff = min_similarity if id in lexical_ids else max(min_similarity, SEMANTIC_ONLY_MIN_SIMILARITY)
        if id in by_id and similarity >= cutoff and id not in used:
            semantic.append(id)
            similarities[id] = similarity
            used.add(id)
    fused = defaultdict(float)
    for branch in [lexical, semantic]:
        counts = defaultdict(int)
        if per_study:
            candidates = []
            for id in branch:
                study = by_id[id].investigation_id
                if counts[study] < 3:
                    candidates.append(id)
                    counts[study] += 1
        else:
            candidates = branch[:limit]
        for rank, id in enumerate(candidates, 1):
            fused[id] += 1 / (60 + rank)
    ordered = sorted(fused, key=lambda id: (-int(exact[id]), -fused[id], id))
    if not per_study:
        ordered = ordered[:limit]
    return [{'evidence': by_id[id], 'score': fused[id], 'exact_match': exact[id],
             'matched_terms': sorted(matched_terms[id]),
             'semantic_similarity': similarities.get(id)} for id in ordered]


def rank_investigations(results, limit):
    groups = defaultdict(list)
    for result in results:
        groups[result['evidence'].investigation_id].append(result)
    studies = []
    for id, matches in groups.items():
        best = matches[0]
        reasons = []
        if best['exact_match']:
            reasons.append('Contains the exact query text in the source or investigation metadata.')
        if best['matched_terms']:
            reasons.append('Matching terms: ' + ', '.join(best['matched_terms']))
        if best['semantic_similarity'] is not None:
            reasons.append('Retrieved evidence is semantically related to the question.')
        studies.append({'investigation_id': id, 'name': best['evidence'].investigation_name,
                        'relevance_score': best['score'], 'exact_match': best['exact_match'],
                        'match_reasons': reasons,
                        'limitations': ['Text relevance does not establish a numerical condition match or habitat safety.'],
                        'evidence': [x['evidence'].model_dump() for x in matches[:3]]})
    # Use each study's best passage, not its document/paragraph count.
    studies.sort(key=lambda x: (-int(x['exact_match']), -x['relevance_score'], x['investigation_id']))
    return [dict(study, rank=i) for i, study in enumerate(studies[:limit], 1)]
