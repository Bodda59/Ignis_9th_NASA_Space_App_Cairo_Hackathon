"""Catalog search candidate selection and rank fusion."""
import re

def tokens(text):
    return re.findall(r'[\w-]+', text.casefold(), flags=re.UNICODE)


def search_score(title, objective, description, other, query, lexical, fuzzy, prefix):
    """Exact IDs are handled by the caller. Components are bounded before fusion."""
    phrase = query.strip(' "').casefold()
    exact = 1 if title.casefold() == phrase else 0
    phrase_boost = sum(weight for value, weight in [(title, 8), (objective, 5), (description, 3), (other, 1)]
                       if phrase and phrase in value.casefold())
    return exact * 100 + phrase_boost + min(float(lexical), 1) * 8 + float(fuzzy) * 3 + float(prefix)

QUESTION_WORDS = set(
    'a an the this that what which where when who why how do does did is are was were can could '
    'would should in on at by for from of to and or with about '
    'study studies studied investigate investigation investigations experiments research tell me'.split()
)


def query_words(query):
    return [word for word in tokens(query) if word not in QUESTION_WORDS][:20] or tokens(query)[:20]


def query_phrases(query, words):
    query_tokens = tokens(query)
    return re.findall(r'"([^"]+)"', query.casefold()) or [
        f'{a} {b}' for a, b in zip(query_tokens, query_tokens[1:]) if a in words and b in words
    ]


def highlight(text, query, phrases=()):
    words = query_words(query)
    pattern = '|'.join(re.escape(w) for w in sorted(set(words), key=lambda word: (-len(word), word)))
    phrase_pattern = '|'.join(re.escape(phrase) for phrase in phrases)
    match = ((re.search(phrase_pattern, text, re.I) if phrase_pattern else None)
             or (re.search(pattern, text, re.I) if pattern else None))
    start = max(0, match.start()-70) if match else 0
    snippet = text[start:start+240]
    spans = [{'start': m.start(), 'end': m.end()} for m in re.finditer(pattern, snippet, re.I)] if pattern else []
    return {'text': snippet, 'matches': spans}


def search_candidates(conn, query, words, category, fuel_type, gravity):
    prefix = ' & '.join(word + ':*' for word in re.findall(r'\w+', ' '.join(words)) if len(word) <= 80) or 'zzempty:*'
    quoted = re.findall(r'"([^"]+)"', query)
    focused = ' '.join(words) if query.endswith('?') and not quoted else query
    phrases = query_phrases(query, words)
    # Passage search uses the existing GIN text index and never reads embeddings.
    return conn.execute('''WITH q AS (
         SELECT websearch_to_tsquery('english',%s) AS full_query,to_tsquery('english',%s) AS prefix_query,
          %s::text[] AS phrases,%s::text[] AS focus_phrases,websearch_to_tsquery('english',%s) AS phrase_query),
        best_passages AS (
         SELECT DISTINCT ON (d.investigation_id) d.investigation_id,p.text,
          ts_rank_cd(to_tsvector('english',p.text),q.full_query) AS rank
         FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id CROSS JOIN q
         WHERE (to_tsvector('english',p.text) @@ q.full_query
            OR to_tsvector('english',p.text) @@ q.prefix_query
            OR to_tsvector('english',p.text) @@ q.phrase_query)
          AND NOT EXISTS(SELECT 1 FROM unnest(q.phrases) phrase WHERE strpos(lower(p.text),lower(phrase))=0)
         ORDER BY d.investigation_id,
          (SELECT count(*) FROM unnest(q.focus_phrases) phrase WHERE strpos(lower(p.text),phrase)>0) DESC,rank DESC,p.id),
        term_hits AS (
         SELECT investigation_id,max(similarity(term,lower(%s))) AS rank
         FROM search_terms WHERE term %% lower(%s) OR term LIKE %s
         GROUP BY investigation_id)
        SELECT s.*,i.updated_at,
         ts_rank_cd(ARRAY[0.1,0.3,0.5,0.8]::real[],s.search_vector,q.full_query) AS lexical,
         greatest(similarity(lower(s.title),lower(%s)),coalesce(t.rank,0)) AS fuzzy,
         (s.search_vector @@ q.prefix_query)::integer AS prefix,
         coalesce(p.rank,0) AS passage_rank,
         p.text AS passage_snippet
        FROM investigation_search s JOIN rag_investigations i ON i.id=s.investigation_id
        CROSS JOIN q LEFT JOIN best_passages p ON p.investigation_id=i.id
        LEFT JOIN term_hits t ON t.investigation_id=i.id
        WHERE (s.search_vector @@ q.full_query OR s.search_vector @@ q.prefix_query
          OR lower(s.title) %% lower(%s) OR lower(s.objective) %% lower(%s)
          OR lower(s.description) %% lower(%s) OR t.investigation_id IS NOT NULL
          OR p.investigation_id IS NOT NULL OR lower(i.id)=lower(%s))
         AND (p.investigation_id IS NOT NULL OR NOT EXISTS(
            SELECT 1 FROM unnest(q.phrases) phrase WHERE
            strpos(lower(s.title || ' ' || s.objective || ' ' || s.description || ' ' || s.other_text),lower(phrase))=0))
         AND (%s::text IS NULL OR i.metadata->'categories' ? %s)
         AND (%s::text IS NULL OR i.metadata->'fuel_types' ? %s)
         AND (%s::text IS NULL OR i.metadata->'gravity_environments' ? %s)''',
                        (focused, prefix, quoted, phrases, ' OR '.join(f'"{phrase}"' for phrase in phrases),
                         query, query, query.casefold().replace('%', '\\%').replace('_', '\\_')+'%',
                         query, query, query, query, query,
                         category, category, fuel_type, fuel_type, gravity, gravity)).fetchall()


def rank_candidates(rows, query, words):
    if re.fullmatch(r'psi-\d+', query, re.I):
        exact_id = [row for row in rows if row['investigation_id'].casefold() == query.casefold()]
        rows = exact_id or rows
    phrases = query_phrases(query, words)
    component_ranks = {}
    for component in ['lexical', 'fuzzy', 'prefix', 'passage_rank']:
        ordered = sorted((row for row in rows if row[component] > 0),
                         key=lambda row: (-row[component], row['investigation_id']))
        component_ranks[component] = {row['investigation_id']: rank for rank, row in enumerate(ordered, 1)}
    ranked = []
    for row in rows:
        fields = [(key, row[key]) for key in ['title', 'objective', 'description', 'other_text']]
        if row['passage_snippet']:
            fields.append(('document', row['passage_snippet']))
        def field_match(field):
            key, value = field
            text = value.casefold()
            weights = {'title': 5, 'objective': 4, 'description': 3, 'other_text': 2, 'document': 1}
            return (sum(phrase in text for phrase in phrases), len(set(words).intersection(tokens(text))), weights[key])
        best = max(fields, key=field_match)
        phrase_hits, word_hits, weight = field_match(best)
        score = search_score(row['title'], row['objective'], row['description'], row['other_text'], query,
                             0, 0, 0)
        score += phrase_hits * (0.3 + 0.05 * weight) + 0.02 * word_hits * weight
        score += sum(1 / (60 + ranks[row['investigation_id']]) for ranks in component_ranks.values()
                     if row['investigation_id'] in ranks)
        if row['investigation_id'].casefold() == query.casefold():
            score += 200
            best = ('investigation_id', row['investigation_id'] + ' · ' + row['title'])
        ranked.append({'id': row['investigation_id'], 'title': row['title'], 'score': score,
                       'matched_field': best[0], 'snippet': highlight(best[1], query, phrases), 'updated_at': row['updated_at']})
    ranked.sort(key=lambda row: (-row['score'], row['id']))
    return ranked
